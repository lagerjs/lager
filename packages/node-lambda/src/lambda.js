'use strict';

const os = require('os');
const fs = require('fs');
const path = require('path');

const AWS = require('aws-sdk');
const archiver = require('archiver');
const Promise = require('bluebird');
const _ = require('lodash');
const exec = Promise.promisify(require('child_process').exec, { multiArgs: true });
const rimraf = Promise.promisify(require('rimraf'));

const IntegrationDataInjector = require('./integration-data-injector');
const plugin = require('./index');

/**
 * Constructor function
 * @param {Object} config - lambda configuration
 * @constructor
 */
const Lambda = function Lambda(config, fsPath) {
  this.identifier = config.identifier;
  this.config = config;
  this.fsPath = fsPath;

  this.config.params = this.config.params || {};
  this.config.params = _.assign({
    FunctionName: this.identifier,
    Handler: 'index.handler',
    Role: 'PLEASE-CONFIGURE-AN-EXECUTION-ROLE-FOR-' + this.identifier,
    Runtime: 'nodejs4.3',
    Timeout: 15,
    Publish: false
  }, this.config.params);

  this.config.modules = this.config.modules || [];
};

/**
 * Returns the lambda identifier in the Lager project
 * @returns {string}
 */
Lambda.prototype.getIdentifier = function getIdentifier() {
  return this.identifier;
};

/**
 * Returns a string representation of a Lambda instance
 * @returns {string}
 */
Lambda.prototype.toString = function toString() {
  return 'Node Lambda ' + this.identifier;
};

/**
 * Returns the lambda location on the file system
 * @returns {string}
 */
Lambda.prototype.getFsPath = function getFsPath() {
  return this.fsPath;
};

/**
 * Returns the list of event examples
 * @returns {Array}
 */
Lambda.prototype.getEventExamples = function getEventExamples() {
  const basePath = this.getFsPath();
  return fs.readdirAsync(path.join(this.getFsPath(), 'events'))
  .then(eventFiles => {
    const events = [];
    eventFiles.forEach(eventFile => {
      const filePath = path.join(basePath, eventFile);
      const parse = path.parse(filePath);
      if (['.js', '.json'].indexOf(parse.ext) !== -1) {
        events.push(parse.name);
      }
    });
    return Promise.resolve(events);
  })
  .catch(e => {
    if (e.code === 'ENOENT') {
      plugin.lager.log.info('No events folder for Lamdba ' + this.getIdentifier());
      return Promise.resolve([]);
    }
    return Promise.reject(e);
  });
};

/**
 * Returns an event examples
 * @returns {Object}
 */
Lambda.prototype.loadEventExample = function loadEventExample(name) {
  return require(path.join(this.getFsPath(), 'events', name));
};

/**
 * Returns the result of a local execution
 * @returns {Object}
 */
Lambda.prototype.executeLocally = function executeLocally(event) {
  return this.installLocally()
  .then(() => {
    const handlerParts = this.config.params.Handler.split('.');
    const m = require(path.join(this.getFsPath(), handlerParts[0]));
    return Promise.promisify(m[handlerParts[1]])(event, {});
  });
};

/**
 * Returns the result of am execution in AWS
 * @returns {Object}
 */
Lambda.prototype.execute = function execute(region, context, event) {
  const awsLambda = new AWS.Lambda({ region });

  const functionName = (context.environment ? context.environment + '-' : '') + this.identifier;
  const params = {
    FunctionName: functionName,
    Payload: JSON.stringify(event)
  };
  if (context.stage) { params.Qualifier = context.stage; }

  return Promise.promisify(awsLambda.invoke.bind(awsLambda))(params);
};

/* istanbul ignore next */
/**
 * Deploys the lambda in AWS
 * @param {string} region - the AWS region where the Lambda must be deployed
 * @param {Object} context - the context object containing the environment and the stage
 * @returns {Promise<Object>} - an object conatining the IntegrationDataInjector of the lambda
 *                              and a report of the deployment
 */
Lambda.prototype.deploy = function deploy(region, context) {
  const awsLambda = new AWS.Lambda({ region });

  const functionName = (context.environment ? context.environment + '-' : '') + this.identifier;
  this.config.params.FunctionName = functionName;
  const report = { name: functionName };

  return this.isDeployed(awsLambda)
  .then(isDeployed => {
    if (isDeployed) {
      // If the function already exists
      plugin.lager.log.debug('The lambda ' + functionName + ' already exists');
      report.operation = 'Update';
      return this.update(awsLambda, context, report);
    }
    // If an error occured because the function does not exists, we create it
    plugin.lager.log.debug('The lambda ' + functionName + ' does not exists');
    report.operation = 'Creation';
    return this.create(awsLambda, context, report);
  })
  .then(data => {
    // Publish a new version
    plugin.lager.log.debug('The Lambda ' + functionName + ' has been deployed');
    return this.publishVersion(awsLambda);
  })
  .then(data => {
    plugin.lager.log.debug('The Lambda ' + functionName + ' has been published: version ' + data.Version);
    report.publishedVersion = data.Version;
    return Promise.all([data.Version, this.aliasExists(awsLambda, context)]);
  })
  .spread((version, aliasExists) => {
    if (aliasExists) {
      // If the alias already exists
      plugin.lager.log.debug('The lambda ' + functionName + ' already has an alias ' + version);
      report.aliasExisted = true;
      return this.updateAlias(awsLambda, version, context);
    }
    // If an error occured because the alias does not exists, we create it
    plugin.lager.log.debug('The lambda ' + functionName + ' is does not have an alias ' + version);
    report.aliasExisted = false;
    return this.createAlias(awsLambda, version, context);
  })
  .then(data => {
    plugin.lager.log.debug('The Lambda ' + functionName + ' version ' + data.FunctionVersion + ' has been aliased ' + data.AliasArn);
    report.aliasArn = data.AliasArn;
    return {
      report: report,
      integrationDataInjector: new IntegrationDataInjector(this, data)
    };
  });
};

/**
 * Install the lambda dependencies
 * @returns {Promise<Lambda>}
 */
Lambda.prototype.installLocally = function install() {
  const fsPath = this.getFsPath();
  return rimraf(path.join(fsPath, 'node_modules'))
  .then(() => {
    return exec('npm install --loglevel=error', { cwd: fsPath });
  })
  .then(() => {
    return this;
  });
};

/**
 * Create a zip package for a lambda and provide it's content in a buffer
 * @returns {Promise<Buffer>}
 */
Lambda.prototype.buildPackage = function buildPackage(report) {
  report = report || {};
  const initTime = process.hrtime();
  const lambdaPath = this.getFsPath();

  return this.installLocally()
  .then(nodeModules => {
    return new Promise((resolve, reject) => {
      const archivePath = path.join(os.tmpdir(), new Buffer(lambdaPath).toString('base64') + '.zip');
      const outputStream = fs.createWriteStream(archivePath);
      const archive = archiver.create('zip', {});
      outputStream.on('close', () => {
        fs.readFile(archivePath, (e, result) => {
          report.packageBuildTime = process.hrtime(initTime);
          if (e) { return reject(e); }
          resolve(result);
        });
      });

      archive.on('error', e => {
        report.packageBuildTime = process.hrtime(initTime);
        reject(e);
      });

      archive.pipe(outputStream);

      // Add the Lamba code to the archive
      archive.directory(lambdaPath, '');

      archive.finalize();
    });
  });
};


/* istanbul ignore next */
/**
 * Check if the Lambda already exists in AWS
 * @returns {Promise<Boolean>}
 */
Lambda.prototype.isDeployed = function isDeployed(awsLambda) {
  const params = { FunctionName: this.config.params.FunctionName };
  return Promise.promisify(awsLambda.getFunction.bind(awsLambda))(params)
  .then((r) => {
    return Promise.resolve(true);
  })
  .catch(e => {
    if (e.code !== 'ResourceNotFoundException') { throw e; }
    return Promise.resolve(false);
  });
};


/* istanbul ignore next */
/**
 * Create the lambda in AWS
 * @returns {Promise<Object>} - AWS description of the lambda
 */
Lambda.prototype.create = function create(awsLambda, context, report) {
  report = report || {};
  let initTime;

  // We clone the configuration update because we will complete it
  // but do not want to alter the original
  const params = _.cloneDeep(this.config.params);
  return Promise.all([
    this.buildPackage(report),
    plugin.lager.call('iam:retrieveRoleArn', params.Role, context, params.Role)
  ])
  .spread((buffer, roleArn) => {
    initTime = process.hrtime();
    params.Code = { ZipFile: buffer };
    params.Role = roleArn;
    return Promise.promisify(awsLambda.createFunction.bind(awsLambda))(params);
  })
  .then(r => {
    report.deployTime = process.hrtime(initTime);
    return Promise.resolve(r);
  });
};


/* istanbul ignore next */
/**
 * Update the lambda in AWS
 * @returns {Promise<Object>} - AWS description of the lambda
 */
Lambda.prototype.update = function update(awsLambda, context, report) {
  report = report || {};
  let initTime;

  return this.buildPackage(report)
  .then((buffer) => {
    initTime = process.hrtime();
    // First, update the code
    const codeParams = {
      FunctionName: this.config.params.FunctionName,
      Publish: this.config.params.Publish,
      ZipFile: buffer
    };
    return Promise.all([
      Promise.promisify(awsLambda.updateFunctionCode.bind(awsLambda))(codeParams),
      plugin.lager.call('iam:retrieveRoleArn', this.config.params.Role, context, this.config.params.Role)
    ]);
  })
  .spread((codeUpdateResponse, roleArn) => {
    // Then, update the configuration
    const configParams = _.cloneDeep(this.config.params);
    delete configParams.Publish;
    configParams.Role = roleArn;
    return Promise.promisify(awsLambda.updateFunctionConfiguration.bind(awsLambda))(configParams);
  })
  .then(r => {
    report.deployTime = process.hrtime(initTime);
    return Promise.resolve(r);
  });
};


/* istanbul ignore next */
/**
 * Create a new version of the lambda
 * @returns {Promise<Object>} - AWS description of the lambda
 */
Lambda.prototype.publishVersion = function publishVersion(awsLambda) {
  const params = {
    FunctionName: this.config.params.FunctionName
  };
  return Promise.promisify(awsLambda.publishVersion.bind(awsLambda))(params);
};

/* istanbul ignore next */
/**
 * [aliasExists description]
 * @param  {[type]} awsLambda [description]
 * @param  {[type]} context   [description]
 * @return {[type]}           [description]
 */
Lambda.prototype.aliasExists = function aliasExists(awsLambda, context) {
  const params = {
    FunctionName: this.config.params.FunctionName,
    Name: context.stage
  };
  return Promise.promisify(awsLambda.getAlias.bind(awsLambda))(params)
  .then(() => {
    return Promise.resolve(true);
  })
  .catch(e => {
    if (e.code !== 'ResourceNotFoundException') { throw e; }
    return Promise.resolve(false);
  });
};

/* istanbul ignore next */
/**
 * [createAlias description]
 * @param  {[type]} awsLambda [description]
 * @param  {[type]} version   [description]
 * @param  {[type]} context   [description]
 * @return {[type]}           [description]
 */
Lambda.prototype.createAlias = function createAlias(awsLambda, version, context) {
  const params = {
    FunctionName: this.config.params.FunctionName,
    FunctionVersion: version,
    Name: context.stage
  };
  return Promise.promisify(awsLambda.createAlias.bind(awsLambda))(params);
};

/* istanbul ignore next */
/**
 * [updateAlias description]
 * @param  {[type]} awsLambda [description]
 * @param  {[type]} version   [description]
 * @param  {[type]} context   [description]
 * @return {[type]}           [description]
 */
Lambda.prototype.updateAlias = function updateAlias(awsLambda, version, context) {
  const params = {
    FunctionName: this.config.params.FunctionName,
    Name: context.stage,
    FunctionVersion: version
  };
  return Promise.promisify(awsLambda.updateAlias.bind(awsLambda))(params);
};


module.exports = Lambda;
