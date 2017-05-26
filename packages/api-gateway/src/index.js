'use strict';

const file = require('file');
const path = require('path');
const fs = require('fs');

const Promise = require('bluebird');
const _ = require('lodash');

let apis;
let endpoints;

/**
 * Load all API specifications
 * @returns {Promise<[Api]>} - the promise of an array containing all APIs
 */
function loadApis() {
  // Shortcut if apis already have been loaded
  if (apis !== undefined) {
    return Promise.resolve(apis);
  }

  const apiSpecsPath = path.join(process.cwd(), plugin.config.apisPath);

  // This event allows to inject code before loading all APIs
  return plugin.myrmex.fire('beforeApisLoad')
  .then(() => {
    // Retrieve configuration path of all API specifications
    return Promise.promisify(fs.readdir)(apiSpecsPath);
  })
  .then(subdirs => {
    // Load all the API specifications
    const apiPromises = [];
    _.forEach(subdirs, (subdir) => {
      const apiSpecPath = path.join(apiSpecsPath, subdir, 'spec');
      // subdir is the identifier of the API, so we pass it as the second argument
      apiPromises.push(loadApi(apiSpecPath, subdir));
    });
    return Promise.all(apiPromises);
  })
  .then(apis => {
    // This event allows to inject code to add or delete or alter API specifications
    return plugin.myrmex.fire('afterApisLoad', apis);
  })
  .spread(loadedApis => {
    apis = loadedApis;
    return Promise.resolve(apis);
  })
  .catch(e => {
    if (e.code === 'ENOENT' && path.basename(e.path) === path.basename(plugin.config.apisPath)) {
      return Promise.resolve([]);
    }
    return Promise.reject(e);
  });
}

/**
 * Load an API specification
 * @param {string} apiSpecPath - the full path to the specification file
 * @param {string} OPTIONAL identifier - a human readable identifier, eventually
 *                                        configured in the specification file itself
 * @returns {Promise<Api>} - the promise of an API instance
 */
function loadApi(apiSpecPath, identifier) {
  return plugin.myrmex.fire('beforeApiLoad', apiSpecPath, identifier)
  .spread((apiSpecPath, identifier) => {
    // Because we use require() to get the spec, it could either be a JSON file
    // or the content exported by a node module
    // But because require() caches the content it loads, we clone the result to avoid bugs
    // if the function is called twice
    const apiSpec = _.cloneDeep(require(apiSpecPath));
    apiSpec['x-myrmex'] = apiSpec['x-myrmex'] || {};

    // Lasy loading because the plugin has to be registered in a Myrmex instance before requiring ./endpoint
    const Api = require('./api');
    const api = new Api(apiSpec, identifier);

    // This event allows to inject code to alter the API specification
    return plugin.myrmex.fire('afterApiLoad', api);
  })
  .spread(api => {
    return api.init();
  });
}

/**
 * Load all Endpoint specifications
 * @returns {Promise<[Endpoints]>} - the promise of an array containing all endpoints
 */
function loadEndpoints() {
  // Shortcut if endpoints already have been loaded
  if (endpoints !== undefined) {
    return Promise.resolve(endpoints);
  }

  const endpointSpecsPath = path.join(process.cwd(), plugin.config.endpointsPath);

  return plugin.myrmex.fire('beforeEndpointsLoad')
  .spread(() => {
    const endpointPromises = [];
    file.walkSync(endpointSpecsPath, (dirPath, dirs, files) => {
      // We are looking for directories that have the name of an HTTP method
      const subPath = dirPath.substr(endpointSpecsPath.length);
      const resourcePathParts = subPath.split(path.sep);
      const method = resourcePathParts.pop();
      if (plugin.httpMethods.indexOf(method) === -1) { return; }

      // We construct the path to the resource
      const resourcePath = resourcePathParts.join('/');

      endpointPromises.push(loadEndpoint(endpointSpecsPath, resourcePath, method));
    });
    return Promise.all(endpointPromises);
  })
  .then(endpoints => {
    return plugin.myrmex.fire('afterEndpointsLoad', endpoints);
  })
  .spread(loadedEndpoints => {
    endpoints = loadedEndpoints;
    return Promise.resolve(endpoints);
  })
  .catch(e => {
    if (e.code === 'ENOENT' && path.basename(e.path) === path.basename(plugin.config.endpointsPath)) {
      return Promise.resolve([]);
    }
    Promise.reject(e);
  });
}

/**
 * Load an Endpoint specification
 * From the `endpointSpecRootPath` directory, myrmex will look for a specification in
 * each subdirectory following the structure `path/to/the/resource/HTTP_METHOD/`
 * @param {string} endpointSpecRootPath - the root directory of the endpoint configuration
 * @param {string} resourcePath - the URL path to the endpoint resource
 * @param {string} method - the HTTP method of the endpoint
 * @returns {Promise<Endpoint>} - the promise of an endpoint instance
 */
function loadEndpoint(endpointSpecRootPath, resourcePath, method) {
  method = method.toUpperCase();
  return plugin.myrmex.fire('beforeEndpointLoad', endpointSpecRootPath, resourcePath, method)
  .spread(() => {
    const parts = resourcePath.split('/');
    const subPath = parts.join(path.sep) + path.sep + method;
    const spec = mergeSpecsFiles(endpointSpecRootPath, subPath);

    // We load the integration templates
    return Promise.map(spec.consume || [], contentType => {
      return loadIntegrationTemplate(path.join(endpointSpecRootPath, resourcePath, method), contentType)
      .then(integrationTemplate => {
        spec['x-amazon-apigateway-integration'] = spec['x-amazon-apigateway-integration'] || {};
        spec['x-amazon-apigateway-integration'].requestTemplates = spec['x-amazon-apigateway-integration'].requestTemplates || {};
        spec['x-amazon-apigateway-integration'].requestTemplates[contentType] = integrationTemplate;
        return Promise.resolve();
      });
    })
    .then(() => {
      // Lasy loading because the plugin has to be registered in a Myrmex instance before requiring ./endpoint
      const Endpoint = require('./endpoint');
      return Promise.resolve(new Endpoint(spec, resourcePath, method));
    });
  })
  .then(endpoint => {
    // This event allows to inject code to alter the endpoint specification
    return plugin.myrmex.fire('afterEndpointLoad', endpoint);
  })
  .spread((endpoint) => {
    return Promise.resolve(endpoint);
  });
}


/**
 * Load all Model specifications
 * @returns {Promise<[Models]>} - the promise of an array containing all models
 */
function loadModels() {
  const modelSpecsPath = path.join(process.cwd(), plugin.config.modelsPath);

  return plugin.myrmex.fire('beforeModelsLoad')
  .spread(() => {
    return Promise.promisify(fs.readdir)(modelSpecsPath);
  })
  .then(fileNames => {
    // Load all the model specifications
    return Promise.map(fileNames, fileName => {
      const modelSpecPath = path.join(modelSpecsPath, fileName);
      const modelName = path.parse(fileName).name;
      return loadModel(modelSpecPath, modelName);
    });
  })
  .then(models => {
    return plugin.myrmex.fire('afterModelsLoad', models);
  })
  .spread(models => {
    return Promise.resolve(models);
  })
  .catch(e => {
    if (e.code === 'ENOENT' && path.basename(e.path) === path.basename(plugin.config.modelsPath)) {
      return Promise.resolve([]);
    }
    Promise.reject(e);
  });
}

/**
 * Load an Model specification
 * @param {string} modelSpecPath - the path to the the model specification
 * @returns {Promise<Model>} - the promise of an model instance
 */
function loadModel(modelSpecPath, name) {
  return plugin.myrmex.fire('beforeModelLoad', modelSpecPath, name)
  .spread(() => {
    // Because we use require() to get the spec, it could either be a JSON file
    // or the content exported by a node module
    // But because require() caches the content it loads, we clone the result to avoid bugs
    // if the function is called twice
    const modelSpec = _.cloneDeep(require(modelSpecPath));

    // Lasy loading because the plugin has to be registered in a Myrmex instance before requiring ./model
    const Model = require('./model');
    return Promise.resolve(new Model(name, modelSpec));
  })
  .then(model => {
    // This event allows to inject code to alter the model specification
    return plugin.myrmex.fire('afterModelLoad', model);
  })
  .spread((model) => {
    return Promise.resolve(model);
  });
}

/**
 * Update the configuration of endpoints with data returned by integration
 * This data can come from the deployment of a lambda function, the configuration
 * of an HTTP proxy, the generation of a mock etc ...
 * @param  {string} region - AWS region
 * @param  {string} stage - API stage
 * @param  {string} environment - environment identifier
 * @returns {[IntegrationObject]} - an array of integrqtion objects
 */
function loadIntegrations(region, context, endpoints) {
  // The `deployIntegrations` hook takes four arguments
  // The region of the deployment
  // The "context" of the deployment
  // The list of endpoints that must be deployed
  // An array that will receive integration results
  const integrationDataInjectors = [];
  return plugin.myrmex.fire('loadIntegrations', region, context, endpoints, integrationDataInjectors)
  .spread((region, context, endpoints, integrationDataInjectors) => {
    // At this point, integration plugins returned their integrationDataInjectors
    return plugin.myrmex.fire('beforeAddIntegrationDataToEndpoints', endpoints, integrationDataInjectors);
  })
  .spread((endpoints, integrationDataInjectors) => {
    return Promise.map(integrationDataInjectors, (integrationDataInjector) => {
      return Promise.map(endpoints, (endpoint) => {
        return integrationDataInjector.applyToEndpoint(endpoint);
      });
    })
    .then(() => {
      return plugin.myrmex.fire('afterAddIntegrationDataToEndpoints', endpoints, integrationDataInjectors);
    });
  })
  .spread((endpoints, integrationDataInjectors) => {
    return Promise.resolve(endpoints);
  });
}

/**
 * Find an APIs by its identifier and return it with its endpoints
 * @param {string} identifier - the API identifier
 * @returns {Api} - the API corresponding to the  identifier
 */
function findApi(identifier) {
  return loadApis()
  .then(apis => {
    const api = _.find(apis, (api) => { return api.getIdentifier() === identifier; });
    if (!api) {
      return Promise.reject(new Error('Could not find the API "' + identifier + '" in the current project'));
    }
    return api;
  });
}

/**
 * Find an endpoint by its resource path and HTTP method
 * @param {string} resourcePath - the resource path of the endpoint
 * @param {string} method - the HTTP method of the endpoint
 * @returns {Endpoint} - the endpoint corresponding to the resource path and the HTTP method
 */
function findEndpoint(resourcePath, method) {
  return loadEndpoints()
  .then(endpoints => {
    const endpoint = _.find(endpoints, endpoint => { return endpoint.getResourcePath() === resourcePath && endpoint.getMethod() === method; });
    if (!endpoint) {
      return Promise.reject(new Error('Could not find the endpoint "' + method + ' ' + resourcePath + '" in the current project'));
    }
    return endpoint;
  });
}

/**
 * Find an model by its name
 * @param {string} name - the name of the model
 * @returns {Model} - the model corresponding to the resource path and the HTTP method
 */
function findModel(name) {
  return loadModels()
  .then(models => {
    const model = _.find(models, model => { return model.getName('spec') === name; });
    if (!model) {
      return Promise.reject(new Error('Could not find the model "' + name + '" in the current project'));
    }
    return model;
  });
}

/**
 * Enrich the myrmex command line
 * @returns {Promise<[program, inquirer]>} - promise of an array containing the parameters
 */
function registerCommands(icli) {
  return Promise.all([
    require('./cli/create-api')(icli),
    require('./cli/create-model')(icli),
    require('./cli/create-endpoint')(icli),
    require('./cli/inspect-api')(icli),
    require('./cli/inspect-endpoint')(icli),
    require('./cli/deploy-apis')(icli)
  ])
  .then(() => {
    return Promise.resolve([]);
  });
}

/**
 * Return the list of policies that should be used to used with the plugin
 * @returns {object}
 */
function getPolicies() {
  // @TODO add event emitters
  return Promise.resolve(require('./aws-policies'));
}

const plugin = {
  name: 'api-gateway',
  version: require('../package.json').version,

  config: {
    apisPath: 'api-gateway' + path.sep + 'apis',
    endpointsPath: 'api-gateway' + path.sep + 'endpoints',
    modelsPath: 'api-gateway' + path.sep + 'models'
  },

  hooks: {
    registerCommands
  },

  httpMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'ANY'],
  loadApis,
  loadEndpoints,
  loadModels,
  loadIntegrations,
  findApi,
  findEndpoint,
  findModel,
  getPolicies,
  getApiConstructor() { return require('./api'); },
  getEndpointConstructor() { return require('./endpoint'); },
  getModelConstructor() { return require('./model'); }
};

module.exports = plugin;


/**
 * Function that aggregates the specifications found in all spec.json|js files in a path
 * @param {string} beginPath - path from which the function will look for swagger.json|js files
 * @param {string} subPath - path until which the function will look for swagger.json|js files
 * @returns {Object} - aggregation of specifications that have been found
 */
function mergeSpecsFiles(beginPath, subPath) {
  // Initialise specification
  const spec = {};

  // List all directories where we have to look for specifications
  const subDirs = subPath.split(path.sep);

  // Initialize the directory path for the do/while statement
  let searchSpecDir = beginPath;

  do {
    let subSpec = {};
    const subDir = subDirs.shift();
    searchSpecDir = path.join(searchSpecDir, subDir);

    try {
      // Try to load the definition and silently ignore the error if it does not exist
      // Because we use require() to get the config, it could either be a JSON file
      // or the content exported by a node module
      // But because require() caches the content it loads, we clone the result to avoid bugs
      // if the function is called twice
      subSpec = _.cloneDeep(require(searchSpecDir + path.sep + 'spec'));
    } catch (e) {
      // Silently ignore the error when calling require() on an unexisting spec.json file
      if (e.code !== 'MODULE_NOT_FOUND') { throw e; }
    }

    // Merge the spec eventually found
    _.merge(spec, subSpec);
  } while (subDirs.length);

  // return the result of the merges
  return spec;
}


function loadIntegrationTemplate(endpointPath, contentType) {
  // @TODO allow to load different integration templates for different mime types
  // We load the integration template that may be present in a "integration.vm" file (velocity template)
  return Promise.promisify(fs.readFile)(path.join(endpointPath, 'integration.vm'))
  .then(buffer => {
    return buffer.toString();
  })
  .catch(e => {
    // Ignore error if the file does not exists
    return Promise.resolve(null);
  });
}
