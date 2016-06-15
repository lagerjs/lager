'use strict';

const path = require('path');
const lager = require('@lager/lager/lib/lager');
const Promise = lager.getPromise();
const fs = Promise.promisifyAll(require('fs'));
const _ = require('lodash');

const Lambda = require('./lambda');

function loadLambdas() {
  let lambdaConfigsPath = path.join(process.cwd(), 'lambdas');

  // This event allows to inject code before loading all APIs
  return lager.fire('beforeLambdasLoad')
  .then(() => {
    // Retrieve configuration path of all API specifications
    return fs.readdirAsync(lambdaConfigsPath);
  })
  .then((subdirs) => {
    // Load all the lambda configurations
    var lambdaPromises = [];
    _.forEach(subdirs, (subdir) => {
      let lambdaConfigPath = path.join(lambdaConfigsPath, subdir, 'config');
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

function loadLambda(lambdaConfigPath, identifier) {
  return lager.fire('beforeLambdaLoad', lambdaConfigPath, identifier)
  .spread((lambdaConfigPath, identifier) => {
    // Because we use require() to get the config, it could either be a JSON file
    // or the content exported by a node module
    // But because require() caches the content it loads, we clone the result to avoid bugs
    // if the function is called twice
    let lambdaConfig = _.cloneDeep(require(lambdaConfigPath));

    // If the handler path is not specified, we consider it is the same that the config path
    lambdaConfig.handlerPath = lambdaConfig.handlerPath || path.dirname(lambdaConfigPath);

    // If the identifier is not specified, it will be the name of the directory that contains the config
    lambdaConfig.identifier = lambdaConfig.identifier || identifier;

    let lambda = new Lambda(lambdaConfig);

    // This event allows to inject code to alter the Lambda configuration
    return lager.fire('afterLambdaLoad', lambda);
  })
  .spread((lambda) => {
    return Promise.resolve(lambda);
  });
}

let lambdas = [];

module.exports = {
  name: 'node-lambda',

  hooks: {
    /**
     *
     */
    registerCommands: function registerCommands(program, inquirer) {
      return Promise.all([
        require('./cli/create-lambda')(program, inquirer)
      ])
      .then(() => {
        return Promise.resolve([program, inquirer]);
      });
    },


    /**
     * This hook load all lambda configurations
     * @return {Boolean}
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
     * @param  {Object} config - the deployment config: a object containing the region, satge, and environment
     * @param  {Array} integrationResults - the collection of integration results
     *                                      we will add our own integrations results
     *                                      to this array
     * @return {Promise<Array>}
     */
    loadIntegrations: function loadIntegrations(config, integrationResults) {
      return Promise.map(lambdas, (lambda) => {
        return lambda.deploy(config.region, config.stage, config.environment);
      })
      .then(lambdaIntegrationDataInjectors => {
        return Promise.resolve([config, _.concat(integrationResults, lambdaIntegrationDataInjectors)]);
      });
    },

    /**
     * When the APIs have been deployed, we should cleanup the Lambda environment
     * and delete the lambdas that are not used anymore
     * @return {[type]} [description]
     */
    afterDeployAll: function afterDeployAll() {
      return Promise.resolve();
    }
  }
};
