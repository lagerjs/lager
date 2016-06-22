'use strict';

const path = require('path');

const lager = require('@lager/lager/src/lib/lager');
const Promise = lager.import.Promise;
const _ = lager.import._;

const fs = Promise.promisifyAll(require('fs'));

const Lambda = require('./lambda');

/**
 * Load all lambda configurations
 * @return {Promise<[Lambda]>} - promise of an array of lambdas
 */
function loadLambdas() {
  const lambdaConfigsPath = path.join(plugin.getPath(), 'lambdas');

  // This event allows to inject code before loading all APIs
  return lager.fire('beforeLambdasLoad')
  .then(() => {
    // Retrieve configuration path of all API specifications
    return fs.readdirAsync(lambdaConfigsPath);
  })
  .then((subdirs) => {
    // Load all the lambda configurations
    const lambdaPromises = [];
    _.forEach(subdirs, (subdir) => {
      const lambdaConfigPath = path.join(lambdaConfigsPath, subdir, 'config');
      // subdir is the identifier of the Lambda, so we pass it as the second argument
      lambdaPromises.push(loadLambda(lambdaConfigPath, subdir));
    });
    return Promise.all(lambdaPromises);
  })
  .then((lambdas) => {
    // This event allows to inject code to add or delete or alter lambda configurations
    return lager.fire('afterLambdasLoad', lambdas);
  })
  .spread((lambdas) => {
    return Promise.resolve(lambdas);
  })
  .catch(e => {
    if (e.code === 'ENOENT' && path.basename(e.path) === 'lambdas') {
      return Promise.resolve([]);
    }
    return Promise.reject(e);
  });
}

/**
 * Load a lambda
 * @param {string} lambdaConfigPath - path to the configuration file
 * @param {string} identifier - the lambda identifier
 * @returns {Promise<Lambda>} - the promise of a lambda
 */
function loadLambda(lambdaConfigPath, identifier) {
  return lager.fire('beforeLambdaLoad', lambdaConfigPath, identifier)
  .spread((lambdaConfigPath, identifier) => {
    // Because we use require() to get the config, it could either be a JSON file
    // or the content exported by a node module
    // But because require() caches the content it loads, we clone the result to avoid bugs
    // if the function is called twice
    const lambdaConfig = _.cloneDeep(require(lambdaConfigPath));

    // If the handler path is not specified, we consider it is the same that the config path
    lambdaConfig.handlerPath = lambdaConfig.handlerPath || path.dirname(lambdaConfigPath);

    // If the identifier is not specified, it will be the name of the directory that contains the config
    lambdaConfig.identifier = lambdaConfig.identifier || identifier;

    const lambda = new Lambda(lambdaConfig);

    // This event allows to inject code to alter the Lambda configuration
    return lager.fire('afterLambdaLoad', lambda);
  })
  .spread((lambda) => {
    return Promise.resolve(lambda);
  });
}

let lambdas = [];

const plugin = {
  name: 'node-lambda',

  hooks: {

    /**
     * Register plugin commands
     * @returns {Promise} - a promise that resolves when all commands are registered
     */
    registerCommands: function registerCommands() {
      return Promise.all([
        require('./cli/create-lambda')()
      ])
      .then(() => {
        return Promise.resolve([]);
      });
    },

    /**
     * This hook load all lambda configurations
     * @returns {Boolean}
     */
    beforeApisLoad: function beforeApisLoad() {
      return loadLambdas()
      .then((loadedLambdas) => {
        lambdas = loadedLambdas;
        return Promise.resolve([]);
      });
    },

    /**
     * This hook perform the deployment of lambdas in AWS and return integration data
     * that will be used to configure the related endpoints
     * @param {string} region - the AWS region where we doing the deployment
     * @param {Object} context - a object containing the stage and the environment
     * @param {Array} integrationResults - the collection of integration results
     *                                      we will add our own integrations results
     *                                      to this array
     * @returns {Promise<Array>}
     */
    loadIntegrations: function loadIntegrations(region, context, integrationResults) {
      return Promise.map(lambdas, (lambda) => {
        return lambda.deploy(region, context);
      })
      .then(lambdaIntegrationDataInjectors => {
        return Promise.resolve([region, context, _.concat(integrationResults, lambdaIntegrationDataInjectors)]);
      });
    },

    /**
     * When the APIs have been deployed, we should cleanup the Lambda environment
     * and delete the lambdas that are not used anymore
     * @returns {[type]} [description]
     */
    afterDeployAll: function afterDeployAll() {
      return Promise.resolve();
    }
  }
};

module.exports = plugin;
