'use strict';

const path = require('path');
const fs = require('fs');

const Table = require('easy-table');
const Promise = require('bluebird');
const _ = require('lodash');

/**
 * Load all lambda configurations
 * @return {Promise<[Lambda]>} - promise of an array of lambdas
 */
function loadLambdas() {
  const lambdaConfigsPath = path.join(process.cwd(), plugin.config.lambdasPath);

  // This event allows to inject code before loading all APIs
  return plugin.lager.fire('beforeLambdasLoad')
  .then(() => {
    // Retrieve configuration path of all Lambdas
    return Promise.promisify(fs.readdir)(lambdaConfigsPath);
  })
  .then((subdirs) => {
    // Load all Lambdas configurations
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
 * @param {string} lambdaConfigPath - path to the configuration file
 * @param {string} identifier - the lambda identifier
 * @returns {Promise<Lambda>} - the promise of a lambda
 */
function loadLambda(lambdaConfigPath, identifier) {
  return plugin.lager.fire('beforeLambdaLoad', lambdaConfigPath, identifier)
  .spread((lambdaConfigPath, identifier) => {
    // Because we use require() to get the config, it could either be a JSON file
    // or the content exported by a node module
    // But because require() caches the content it loads, we clone the result to avoid bugs
    // if the function is called twice.
    const lambdaConfig = _.cloneDeep(require(lambdaConfigPath));

    // If the handler path is not specified, we consider it is the same that the config path
    lambdaConfig.handlerPath = lambdaConfig.handlerPath || path.dirname(lambdaConfigPath);

    // If the identifier is not specified, it will be the name of the directory that contains the config
    lambdaConfig.identifier = lambdaConfig.identifier || identifier;

    // Lasy loading because the plugin has to be registered in a Lager instance before requiring ./lambda
    const Lambda = require('./lambda');
    const lambda = new Lambda(lambdaConfig);

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
  const nodePackagesPath = path.join(process.cwd(), plugin.config.modulesPath);

  return plugin.lager.fire('beforeNodeModulesLoad')
  .then(() => {
    // Retrieve paths of all node packages
    return Promise.promisify(fs.readdir)(nodePackagesPath);
  })
  .then(subdirs => {
    // Load all packages configurations
    const nodePackagePromises = [];
    _.forEach(subdirs, (subdir) => {
      const nodePackageJsonPath = path.join(nodePackagesPath, subdir, 'package.json');
      // subdir is the name of the package, so we pass it as the second argument
      nodePackagePromises.push(loadNodeModule(nodePackageJsonPath, subdir));
    });
    return Promise.all(nodePackagePromises);
  })
  .then(nodePackages => {
    return Promise.resolve(nodePackages);
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
function loadNodeModule(packageJsonPath, name) {
  return plugin.lager.fire('beforeNodeModuleLoad', packageJsonPath, name)
  .spread((packageJsonPath, name) => {
    const packageJson = require(packageJsonPath);

    // Lasy loading because the plugin has to be registered in a Lager instance before requiring ./node-module
    const NodeModule = require('./node-module');
    const nodePackage = new NodeModule(packageJson, name, path.dirname(packageJsonPath));

    // This event allows to inject code to alter the Lambda configuration
    return plugin.lager.fire('afterNodeModuleLoad', nodePackage);
  })
  .spread(nodePackage => {
    return Promise.resolve(nodePackage);
  });
}

/**
 * Deploy a list of Lambdas
 * @param {Array} lambdaIdentifiers - List of Lambdas identifiers
 * @param {string} region - AWS region where we want to deploy the Lambdas
 * @param {Object} context - an object containing the environment and the alias/stage to apply to the Lambdas
 * @return {Promise<[Api]>} - a promise of a list of published Lambdas IndegrationDataInjectors
 */
function deploy(lambdaIdentifiers, region, context) {
  return loadLambdas()
  .then(lambdas => {
    // If lambdaIdentifier is empty, we deploy all lambdas
    if (lambdaIdentifiers) {
      lambdas = _.filter(lambdas, lambda => { return lambdaIdentifiers.indexOf(lambda.getIdentifier()) !== -1; });
    }
    return Promise.map(lambdas, (lambda) => {
      return lambda.deploy(region, context);
    });
  })
  .then(results => {
    const t = new Table();
    _.forEach(results, result => {
      t.cell('Name', result.report.name);
      t.cell('Operation', result.report.operation);
      t.cell('Version', result.report.publishedVersion);
      t.cell('Alias', result.report.aliasExisted ? 'Updated' : 'Created');
      t.cell('ARN', result.report.aliasArn);
      t.cell('Zip build time', formatHrTime(result.report.packageBuildTime));
      t.cell('Deploy time', formatHrTime(result.report.deployTime));
      t.newRow();
    });
    console.log();
    console.log('Lambda functions deployed');
    console.log();
    console.log(t.toString());
    return results;
  });
}

/**
 * Install a list of Lambdas locally
 * @param {Array} lambdaIdentifiers - List of Lambdas identifiers
 * @return {Promise}
 */
function installLocally(lambdaIdentifiers) {
  return loadLambdas()
  .then(lambdas => {
    // If lambdaIdentifier is empty, we install all lambdas
    if (lambdaIdentifiers) {
      lambdas = _.filter(lambdas, lambda => { return lambdaIdentifiers.indexOf(lambda.getIdentifier()) !== -1; });
    }
    return Promise.map(lambdas, (lambda) => {
      return lambda.installLocally();
    });
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

const plugin = {
  name: 'node-lambda',

  config: {
    lambdasPath: 'node-lambda' + path.sep + 'lambdas',
    modulesPath: 'node-lambda' + path.sep + 'modules'
  },

  hooks: {

    /**
     * Register plugin commands
     * @returns {Promise} - a promise that resolves when all commands are registered
     */
    registerCommands: function registerCommands(icli) {
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
     * This hook load all lambda configurations
     * @returns {Boolean}
     */
    beforeApisLoad: function beforeApisLoad() {
      return loadLambdas();
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
      return deploy(null, region, context)
      .then(results => {
        _.forEach(results, r => {
          integrationResults.push(r.integrationDataInjector);
        });
      });
    },

    /**
     * @TODO: When the APIs have been deployed, we should cleanup the Lambda environment
     * and delete the lambdas that are not used anymore
     * @returns {[type]} [description]
     */
    afterDeployAll: function afterDeployAll() {
      return Promise.resolve();
    }
  },

  extensions: {
    getLambdas: loadLambdas
  },

  loadModules,
  loadLambdas,
  findNodeModule,
  findLambda,
  deploy,
  installLocally
};

module.exports = plugin;

/**
 * Format the result of process.hrtime() into numeric with 3 decimals
 * @param  {Array} hrTime
 * @return {numeric}
 */
function formatHrTime(hrTime) {
  return hrTime[0] + Math.round(hrTime[1] / 1000000) / 1000;
}
