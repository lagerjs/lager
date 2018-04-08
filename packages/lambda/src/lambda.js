'use strict';

const os = require('os');
const fs = require('fs');
const path = require('path');

const AWS = require('aws-sdk');
const archiver = require('archiver');
const Promise = require('bluebird');
const _ = require('lodash');

const IntegrationDataInjector = require('./integration-data-injector');
const plugin = require('./index');

const runtimeMethods = {
  nodejs: require('./lambda-runtime/nodejs'),
  python: require('./lambda-runtime/python')
};

const runtimes = {
  nodejs: ['nodejs4.3', 'nodejs6.10', 'nodejs8.10'],
  python: ['python2.7', 'python3.6']
};

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
  this.config.params = _.merge({
    FunctionName: this.identifier,
    Role: 'PLEASE-CONFIGURE-AN-EXECUTION-ROLE-FOR-' + this.identifier,
    Timeout: 15,
    Publish: false
  }, this.config.params);

  let runtimeLanguage;
  _.forEach(runtimes, (versions, language) => {
    if (versions.indexOf(this.config.params.Runtime) !== -1) {
      runtimeLanguage = language;
    }
  });
  if (!runtimeLanguage) { throw new Error(this.config.params.Runtime + ' is not a valid runtime'); }
  this.runtimeMethods = runtimeMethods[runtimeLanguage];

  this.config.modules = this.config.modules || [];
};

/**
 * Returns the lambda identifier in the Myrmex project
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
 * Returns the content of the package.json file of the lambda
 * @returns {object}
 */
Lambda.prototype.getPackageJson = function getPackageJson() {
  if (this.config.params.Runtime.substr(0, 6) === 'nodejs') {
    return require(path.join(this.fsPath, 'package.json'));
  } else {
    throw new Error('Tried to load a package.json file on a ' + this.config.params.Runtime + ' Lambda (' + this.getIdentifier() + ')');
  }
};

/**
 * Returns the lambda runtime
 * @returns {string}
 */
Lambda.prototype.getRuntime = function getRuntime() {
  return this.config.params.Runtime;
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
      plugin.myrmex.log.info('No events folder for Lamdba ' + this.getIdentifier());
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
  return this.runtimeMethods.executeLocally(this, event);
};

/**
 * Returns the result of am execution in AWS
 * @returns {Object}
 */
Lambda.prototype.execute = function execute(region, context, event, alias) {
  const awsLambda = new AWS.Lambda({ region });

  const functionName = (context.environment ? context.environment + '-' : '') + this.identifier;
  const params = {
    FunctionName: functionName,
    Payload: JSON.stringify(event)
  };
  if (alias) { params.Qualifier = alias; }

  return awsLambda.invoke(params).promise();
};

/**
 * Returns an integration data injector for the API Gateway plugin
 * @param {string} region - the AWS region where the Lambda must be deployed
 * @param {Object} context - the context object containing the environment and the alias
 * @return {Promise<Object>} - an object conatining the IntegrationDataInjector of the lambda
 *                              and a report of the deployment
 */
Lambda.prototype.getIntegrationDataInjector = function getIntegrationDataInjector(region, context) {
  const awsLambda = new AWS.Lambda({ region });

  const functionName = (context.environment ? context.environment + '-' : '') + this.identifier;
  this.config.params.FunctionName = functionName;

  const params = {
    FunctionName: this.config.params.FunctionName
  };
  if (context.alias) {
    params.Qualifier = context.alias;
  }
  return awsLambda.getFunction(params).promise()
  .then(data => {
    return Promise.resolve(new IntegrationDataInjector(this, data));
  });
};

/**
 * Deploys the lambda in AWS
 * @param {string} region - the AWS region where the Lambda must be deployed
 * @param {Object} context - the context object containing the environment and the alias
 * @return {Promise<Object>} - an object conatining the IntegrationDataInjector of the lambda
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
      plugin.myrmex.log.debug('The lambda ' + functionName + ' already exists');
      report.operation = 'Update';
      return this.update(awsLambda, context, report);
    }
    // If an error occured because the function does not exists, we create it
    plugin.myrmex.log.debug('The lambda ' + functionName + ' does not exists');
    report.operation = 'Creation';
    return this.create(awsLambda, context, report);
  })
  .then(data => {
    // Publish a new version
    plugin.myrmex.log.debug('The Lambda ' + functionName + ' has been deployed');
    if (context.alias) {
      // Set the alias if needed
      return this.setAlias(awsLambda, context.alias, report);
    }
    // If no alias is specified, we will use $LATEST
    report.arn = data.FunctionArn;
    return Promise.resolve(data);
  })
  .then(data => {
    return report;
  })
  .catch(e => {
    console.log('Could not deploy ' + functionName);
    console.log(e);
    return Promise.reject(e);
  });
};

/**
 * Install the lambda dependencies
 * @returns {Promise<Lambda>}
 */
Lambda.prototype.installLocally = function install() {
  return Promise.resolve(this.runtimeMethods.installLocally(this))
  .then(() => {
    return this;
  });
};

/**
 * Create a zip package for a lambda and provide it's content in an object following the definition of the AWS SDK
 * methods createFunction() and updateFunctionCode()
 * http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Lambda.html#createFunction-property
 * http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Lambda.html#updateFunctionCode-property
 * {
 *   S3Bucket: "myBucket",
 *   S3Key: "myKey",
 *   S3ObjectVersion: "1",
 *   ZipFile: <Binary String>
 * }
 * @returns {Promise<Object>}
 */
Lambda.prototype.buildPackage = function buildPackage(context, report) {
  report = report || {};
  const initTime = process.hrtime();
  const codeParams = {};

  return plugin.myrmex.fire('buildLambdaPackage', this, context, codeParams)
  .then(() => {
    if (Object.keys(codeParams).length === 0) {
      // If no plugin has fullfied "codeParams", we execute the default packaging
      return this._buildPackage();
    }
    return Promise.resolve(codeParams);
  })
  .then(codeParams => {
    report.packageBuildTime = process.hrtime(initTime);
    return Promise.resolve(codeParams);
  });
};

/**
 * Fallback package creation if no plugin implement the hook "buildLambdaPackage"
 * Create a zip package for a lambda and provide it's content in an object following the definition of the AWS SDK
 * methods createFunction() and updateFunctionCode()
 * {
 *   ZipFile: <Buffer>
 * }
 * @returns {Promise<Object>}
 */
Lambda.prototype._buildPackage = function _buildPackage() {
  const lambdaPath = this.getFsPath();

  return this.installLocally()
  .then(nodeModules => {
    return new Promise((resolve, reject) => {
      const archivePath = path.join(os.tmpdir(), new Buffer(lambdaPath).toString('base64') + '.zip');
      const outputStream = fs.createWriteStream(archivePath);
      const archive = archiver.create('zip', {});
      outputStream.on('close', () => {
        fs.readFile(archivePath, (e, result) => {
          if (e) { return reject(e); }
          resolve({ ZipFile: result });
        });
      });

      archive.on('error', e => {
        reject(e);
      });

      archive.pipe(outputStream);

      // Add the Lamba code to the archive
      archive.directory(lambdaPath, '');

      archive.finalize();
    });
  });
};

/**
 * Check if the Lambda already exists in AWS
 * @returns {Promise<Boolean>}
 */
Lambda.prototype.isDeployed = function isDeployed(awsLambda) {
  const params = { FunctionName: this.config.params.FunctionName };
  return awsLambda.getFunction(params).promise()
  .then((r) => {
    return Promise.resolve(true);
  })
  .catch(e => {
    if (e.code !== 'ResourceNotFoundException') { throw e; }
    return Promise.resolve(false);
  });
};

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
    this.buildPackage(context, report),
    retrieveRoleArn(params.Role, context)
  ])
  .spread((codeReference, roleArn) => {
    initTime = process.hrtime();
    params.Code = codeReference;
    params.Role = roleArn;
    return awsLambda.createFunction(params).promise();
  })
  .then(r => {
    report.deployTime = process.hrtime(initTime);
    return Promise.resolve(r);
  });
};

/**
 * Update the lambda in AWS
 * @returns {Promise<Object>} - AWS description of the lambda
 */
Lambda.prototype.update = function update(awsLambda, context, report) {
  report = report || {};
  let initTime;

  return this.buildPackage(context, report)
  .then(codeParams => {
    initTime = process.hrtime();
    // First, update the code
    codeParams.FunctionName = this.config.params.FunctionName;
    codeParams.Publish = this.config.params.Publish;
    return Promise.all([
      awsLambda.updateFunctionCode(codeParams).promise(),
      retrieveRoleArn(this.config.params.Role, context)
    ]);
  })
  .spread((codeUpdateResponse, roleArn) => {
    // Then, update the configuration
    const configParams = _.cloneDeep(this.config.params);
    delete configParams.Publish;
    configParams.Role = roleArn;
    return awsLambda.updateFunctionConfiguration(configParams).promise();
  })
  .then(r => {
    report.deployTime = process.hrtime(initTime);
    return Promise.resolve(r);
  });
};

/**
 * Create a new version of the lambda
 * @returns {Promise<Object>} - AWS description of the lambda
 */
Lambda.prototype.publishVersion = function publishVersion(awsLambda) {
  const params = {
    FunctionName: this.config.params.FunctionName
  };
  return awsLambda.publishVersion(params).promise();
};

/**
 * [setAlias description]
 * @param {[type]} awsLambda [description]
 * @param {[type]} context   [description]
 * @param {[type]} context   [description]
 */
Lambda.prototype.setAlias = function setAlias(awsLambda, alias, report) {
  return this.publishVersion(awsLambda)
  .then(data => {
    plugin.myrmex.log.debug('The Lambda ' + this.config.params.functionName + ' has been published: version ' + data.Version);
    report.publishedVersion = data.Version;
    return Promise.all([data.Version, this.aliasExists(awsLambda, alias)]);
  })
  .spread((version, aliasExists) => {
    if (aliasExists) {
      // If the alias already exists
      plugin.myrmex.log.debug('The lambda ' + this.config.params.FunctionName + ' already has an alias ' + version);
      report.aliasExisted = true;
      return this.updateAlias(awsLambda, version, alias);
    }
    // If an error occured because the alias does not exists, we create it
    plugin.myrmex.log.debug('The lambda ' + this.config.params.FunctionName + ' does not have an alias ' + version);
    report.aliasExisted = false;
    return this.createAlias(awsLambda, version, alias);
  })
  .then(data => {
    plugin.myrmex.log.debug('The Lambda ' + this.config.params.FunctionName + ' version ' + data.FunctionVersion + ' has been aliased ' + data.AliasArn);
    report.arn = data.AliasArn;
    return Promise.resolve(report);
  });
};

/**
 * [aliasExists description]
 * @param  {[type]} awsLambda [description]
 * @param  {[type]} alias     [description]
 * @return {[type]}           [description]
 */
Lambda.prototype.aliasExists = function aliasExists(awsLambda, alias) {
  const params = {
    FunctionName: this.config.params.FunctionName,
    Name: alias
  };
  return awsLambda.getAlias(params).promise()
  .then(() => {
    return Promise.resolve(true);
  })
  .catch(e => {
    if (e.code !== 'ResourceNotFoundException') { throw e; }
    return Promise.resolve(false);
  });
};

/**
 * [createAlias description]
 * @param  {[type]} awsLambda [description]
 * @param  {[type]} version   [description]
 * @param  {[type]} context   [description]
 * @return {[type]}           [description]
 */
Lambda.prototype.createAlias = function createAlias(awsLambda, version, alias) {
  const params = {
    FunctionName: this.config.params.FunctionName,
    FunctionVersion: version,
    Name: alias
  };
  return awsLambda.createAlias(params).promise();
};

/**
 * [updateAlias description]
 * @param  {[type]} awsLambda [description]
 * @param  {[type]} version   [description]
 * @param  {[type]} context   [description]
 * @return {[type]}           [description]
 */
Lambda.prototype.updateAlias = function updateAlias(awsLambda, version, alias) {
  const params = {
    FunctionName: this.config.params.FunctionName,
    Name: alias,
    FunctionVersion: version
  };
  return awsLambda.updateAlias(params).promise();
};


module.exports = Lambda;


function retrieveRoleArn(roleName, context) {
  return plugin.myrmex.call('iam:retrieveRoleArn', roleName, context, roleName)
  .then(arn => {
    return new Promise(resolve => {
      // HACK We delay the response because if the iam plugin has to deploy the role,
      // it is possible to receive the following error when deploying a Lambda immediately after:
      // InvalidParameterValueException: The role defined for the function cannot be assumed by Lambda.
      setTimeout(() => { resolve(arn); }, 2000);
    });
  });
}
