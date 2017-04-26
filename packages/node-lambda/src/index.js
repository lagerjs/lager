'use strict';

const path = require('path');
const fs = require('fs');

const Promise = require('bluebird');
const _ = require('lodash');

/**
 * Load all lambda configurations
 * @return {Promise<[Lambda]>} - promise of an array of lambdas
 */
function loadLambdas() {
  const lambdasPath = path.join(process.cwd(), plugin.config.lambdasPath);

  // This event allows to inject code before loading all APIs
  return plugin.lager.fire('beforeLambdasLoad')
  .then(() => {
    // Retrieve configuration path of all Lambdas
    return Promise.promisify(fs.readdir)(lambdasPath);
  })
  .then((subdirs) => {
    // Load all Lambdas configurations
    const lambdaPromises = [];
    _.forEach(subdirs, (subdir) => {
      const lambdaPath = path.join(lambdasPath, subdir);
      // subdir is the identifier of the Lambda, so we pass it as the second argument
      lambdaPromises.push(loadLambda(lambdaPath, subdir));
    });
    return Promise.all(lambdaPromises);
  })
  .then((lambdas) => {
    // This event allows to inject code to add or delete or alter lambda configurations
    return plugin.lager.fire('afterLambdasLoad', lambdas);
  })
  .spread((lambdas) => {
    return Promise.resolve(lambdas);
  })
  .catch(e => {
    // In case the project does not have any Lambda yet, an exception will be thrown
    // We silently ignore it
    if (e.code === 'ENOENT' && path.basename(e.path) === 'lambdas') {
      return Promise.resolve([]);
    }
    return Promise.reject(e);
  });
}

/**
 * Load a lambda
 * @param {string} lambdaPath - path to the Lambda module
 * @param {string} identifier - the lambda identifier
 * @returns {Promise<Lambda>} - the promise of a lambda
 */
function loadLambda(lambdaPath, identifier) {
  return plugin.lager.fire('beforeLambdaLoad', lambdaPath, identifier)
  .spread((lambdaPath, identifier) => {
    // Because we use require() to get the config, it could either be a JSON file
    // or the content exported by a node module
    // But because require() caches the content it loads, we clone the result to avoid bugs
    // if the function is called twice.
    const lambdaConfig = _.cloneDeep(require(path.join(lambdaPath, 'config')));

    // If the identifier is not specified, it will be the name of the directory that contains the config
    lambdaConfig.identifier = lambdaConfig.identifier || identifier;

    // Lasy loading because the plugin has to be registered in a Lager instance before requiring ./lambda
    const Lambda = require('./lambda');
    const lambda = new Lambda(lambdaConfig, lambdaPath);

    // This event allows to inject code to alter the Lambda configuration
    return plugin.lager.fire('afterLambdaLoad', lambda);
  })
  .spread((lambda) => {
    return Promise.resolve(lambda);
  });
}

/**
 * Load all packages
 * @return {Promise<[NodeModule]>} - promise of an array of node packages
 */
function loadModules() {
  const nodeModulesPath = path.join(process.cwd(), plugin.config.modulesPath);

  return plugin.lager.fire('beforeNodeModulesLoad')
  .then(() => {
    // Retrieve paths of all node packages
    return Promise.promisify(fs.readdir)(nodeModulesPath);
  })
  .then(subdirs => {
    // Load all packages configurations
    const nodeModulePromises = [];
    _.forEach(subdirs, (subdir) => {
      const nodeModulePath = path.join(nodeModulesPath, subdir);
      // subdir is the name of the package, so we pass it as the second argument
      nodeModulePromises.push(loadNodeModule(nodeModulePath, subdir));
    });
    return Promise.all(nodeModulePromises);
  })
  .then(nodeModules => {
    // This event allows to inject code to add or delete or alter node modules configurations
    return plugin.lager.fire('afterNodeModulesLoad', nodeModules);
  })
  .spread(nodeModules => {
    return Promise.resolve(nodeModules);
  })
  .catch(e => {
    // In case the project does not have any node package yet, an exception will be thrown
    // We silently ignore it
    if (e.code === 'ENOENT' && path.basename(e.path) === 'modules') {
      return Promise.resolve([]);
    }
    return Promise.reject(e);
  });
}

/**
 * Load a NodeModule object
 * @param  {string} packageJsonPath - path to the package.json file of the package
 * @param  {string} name - name of the package
 * @return {Promise<NodeModule>} - promise of a node packages
 */
function loadNodeModule(nodeModulePath, name) {
  return plugin.lager.fire('beforeNodeModuleLoad', nodeModulePath, name)
  .spread((nodeModulePath, name) => {
    let packageJson = {};
    try {
      packageJson = _.cloneDeep(require(path.join(nodeModulePath, 'package.json')));
    } catch (e) {
      if (e.code !== 'MODULE_NOT_FOUND') {
        throw e;
      }
    }

    // Lasy loading because the plugin has to be registered in a Lager instance before requiring ./node-module
    const NodeModule = require('./node-module');
    const nodePackage = new NodeModule(packageJson, name, nodeModulePath);

    // This event allows to inject code to alter the Lambda configuration
    return plugin.lager.fire('afterNodeModuleLoad', nodePackage);
  })
  .spread(nodePackage => {
    return Promise.resolve(nodePackage);
  });
}

/**
 * Find an Lambda by its identifier
 * @param {string} name - the name of the Lambda
 * @returns {Array}
 */
function findLambda(identifier) {
  return loadLambdas()
  .then(lambdas => {
    const lambda = _.find(lambdas, (lambda) => { return lambda.getIdentifier() === identifier; });
    if (!lambda) {
      throw new Error('The Lambda "' + identifier + '" does not exists in this Lager project');
    }
    return lambda;
  });
}

/**
 * Find an node package by its identifier
 * @param {string} name - the name of the node package
 * @returns {Array}
 */
function findNodeModule(name) {
  return loadModules()
  .then(nodeModules => {
    const nodeModule = _.find(nodeModules, (nodeModule) => { return nodeModule.getName() === name; });
    if (!nodeModule) {
      throw new Error('The node module "' + name + '" does not exists in this Lager project');
    }
    return nodeModule;
  });
}

/**
 * Return the list of policies that should be used to used with the plugin
 * @returns {object}
 */
function getPolicies() {
  return Promise.resolve(require('./aws-policies'));
}

const plugin = {
  name: 'node-lambda',

  config: {
    lambdasPath: 'node-lambda' + path.sep + 'lambdas',
    modulesPath: 'node-lambda' + path.sep + 'modules'
  },

  hooks: {

    afterInit: function afterInitHook() {
      plugin.config.environment = plugin.config.environment || plugin.lager.getConfig('environment');
      plugin.config.stage = plugin.config.stage || plugin.lager.getConfig('stage');
    },

    /**
     * Register plugin commands
     * @returns {Promise} - a promise that resolves when all commands are registered
     */
    registerCommands: function registerCommandsHook(icli) {
      return Promise.all([
        require('./cli/create-node-lambda')(icli),
        require('./cli/create-node-module')(icli),
        require('./cli/deploy-node-lambdas')(icli),
        require('./cli/install-node-lambdas-locally')(icli),
        require('./cli/test-node-lambda-locally')(icli),
        require('./cli/test-node-lambda')(icli)
      ]);
    },

    /**
     * This hook allows to complete commands
     * @param {Object} commandConfig - a command being added to the Lager CLI
     * @returns {Promise}
     */
    createCommand: function createCommandHook(commandConfig) {
      return require('./hooks/create-command').hook(commandConfig);
    },

    /**
     * This hook perform the deployment of lambdas in AWS and return integration data
     * that will be used to configure the related endpoints
     * @param {string} region - the AWS region where we doing the deployment
     * @param {Object} endpoints - the list of endpoints that will be deployed
     * @param {Array} context - a object containing the stage and the environment
     * @param {Array} integrationResults - the collection of integration results
     *                                     we will add our own integrations results
     *                                     to this array
     * @returns {Promise<Array>}
     */
    loadIntegrations: function loadIntegrationsHook(region, context, endpoints, integrationResults) {
      return require('./hooks/load-integration').hook(region, context, endpoints, integrationResults);
    }
  },

  extensions: {
    getLambdas: loadLambdas
  },

  loadModules,
  loadLambdas,
  findNodeModule,
  findLambda,
  getPolicies
};

module.exports = plugin;
