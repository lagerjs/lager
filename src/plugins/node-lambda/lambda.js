'use strict';

const fs = require('fs');
const path = require('path');
const lager = require('@lager/lager/lib/lager');
const Promise = lager.getPromise();
const _ = require('lodash');
const AWS = require('aws-sdk');
const archiver = require('archiver');
const IntegrationDataInjector = require('./integration-data-injector');


/**
 * Constructor function
 * @param {Object} config - lambda configuration
 * @constructor
 */
const Lambda = function Lambda(config) {
  this.config = config;

  this.config.params = this.config.params || {};
  this.config.params = _.assign({
    FunctionName: config.identifier,
    Handler: 'lambda.handler',
    Role: 'PLEASE-CONFIGURE-AN-EXECUTION-ROLE-FOR-' + config.identifier,
    Runtime: 'nodejs4.3',
    Timeout: 15,
    Publish: false
  }, this.config.params);

  this.config.includeLibs = this.config.includeLibs || [];
  _.forEach(this.config.includeLibs, (libDir, index) => {
    this.config.includeLibs[index] = path.join(process.cwd(), 'libs', libDir);
  });
  if (this.config.includeEndpoints) {
    this.config.includeLibs.push(path.join(process.cwd(), 'endpoints'));
  }
};

/**
 * Returns a string representation of a Lambda instance
 * @returns {string}
 */
Lambda.prototype.toString = function toString() {
  return 'Lambda ' + this.config.identifier;
};

/**
 * Deploys the lambda in AWS
 * @returns {Promise<LambdaIntegrationDataInjector>} - the IntegrationDataInjector of the lambda
 */
Lambda.prototype.deploy = function deploy(region, stage, environment) {
  console.log('   * Deploy ' + this.config.identifier);

  const awsLambda = new AWS.Lambda({ region });
  return this.isDeployed(awsLambda)
  .then((isDeployed) => {
    if (isDeployed) {
      // If the function already exists
      console.log('   * The lambda ' + this.config.identifier + ' already exists');
      return this.update(awsLambda, environment);
    }
    // If error occured because the function does not exists, we create it
    console.log('   * The lambda ' + this.config.identifier + ' does not exists');
    return this.create(awsLambda, environment);
  })
  .then((data) => {
    // Publish a new version
    console.log('   * Lambda ' + this.config.identifier + ' deployed');
    return this.publishVersion(awsLambda, stage);
  })
  .then((data) => {
    console.log('   * Lambda ' + this.config.identifier + ' published: \x1b[0;36mversion ' + data.Version + '\x1b[0m');
    console.log('   * Function ARN: \x1b[0;36m' + data.FunctionArn + '\x1b[0m\n');
    return new IntegrationDataInjector(data);
  });
};


/**
 * Create a zip package for a lambda and provide it's content in a buffer
 * @returns {Promise<Buffer>}
 */
Lambda.prototype.buildPackage = function buildPackage() {
  const lambdaPath = this.config.handlerPath;
  const dependenciesPaths = this.config.includeLibs || [];

  return new Promise((resolve, reject) => {
    const archivePath = '/tmp/' + new Buffer(lambdaPath).toString('base64') + '.zip';
    const outputStream = fs.createWriteStream(archivePath);
    const archive = archiver.create('zip', {});
    outputStream.on('close', () => {
      fs.readFile(archivePath, (e, result) => {
        if (e) { return reject(e); }
        resolve(result);
      });
    });

    archive.on('error', e => {
      reject(e);
    });

    archive.pipe(outputStream);

    // Add the Lamba code to the archive
    archive.directory(lambdaPath, '');

    // Add the library code (aka code in common for all lambdas) to the archive
    dependenciesPaths.forEach(dependencyPath => {
      archive.directory(dependencyPath, path.basename(dependencyPath));
    });

    // Add the application configuration of the environment to the archive
    const envConfig = process.env;
    envConfig.LAMBDA = true;
    archive.append(JSON.stringify(envConfig), { name: 'env_config.json' });

    archive.finalize();
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
 * Create the lambda in AWS
 * @returns {Promise<Object>} - AWS description of the lambda
 */
Lambda.prototype.create = function create(awsLambda, environment) {
  const params = _.cloneDeep(this.config.params);
  return Promise.all([this.buildPackage(), lager.retrieveRoleArn(params.Role, environment)])
  .spread((buffer, roleArn) => {
    params.Code = { ZipFile: buffer };
    params.Role = roleArn;
    return Promise.promisify(awsLambda.createFunction.bind(awsLambda))(params);
  });
};


/* istanbul ignore next */
/**
 * Update the lambda in AWS
 * @returns {Promise<Object>} - AWS description of the lambda
 */
Lambda.prototype.update = function update(awsLambda, environment) {
  return this.buildPackage()
  .then((buffer) => {
    // First, update the code
    const codeParams = {
      FunctionName: this.config.params.FunctionName,
      Publish: this.config.params.Publish,
      ZipFile: buffer
    };
    return [
      Promise.promisify(awsLambda.updateFunctionCode.bind(awsLambda))(codeParams),
      lager.retrieveRoleArn(this.config.params.Role, environment)
    ];
  })
  .spread((codeUpdateResponse, roleArn) => {
    // Then, update the configuration
    const configParams = _.cloneDeep(this.config.params);
    delete configParams.Publish;
    configParams.Role = roleArn;
    return Promise.promisify(awsLambda.updateFunctionConfiguration.bind(awsLambda))(configParams);
  });
};


/* istanbul ignore next */
/**
 * Create a new version of the lambda
 * @returns {Promise<Object>} - AWS description of the lambda
 */
Lambda.prototype.publishVersion = function publishVersion(awsLambda, alias) {
  // @TODO set alias and delete previous version
  const params = {
    FunctionName: this.config.params.FunctionName
  };
  return Promise.promisify(awsLambda.publishVersion.bind(awsLambda))(params);
};

module.exports = Lambda;
