'use strict';

const file = require('file');
const path = require('path');

const lager = require('@lager/lager/lib/lager');
const Promise = lager.import.Promise;
const _ = lager.import._;

const fs = Promise.promisifyAll(require('fs'));

const Api = require('./api');
const Endpoint = require('./endpoint');

/**
 * Load all API specifications
 * @returns {Promise<[Api]>} - the promise of an array containing all APIs
 */
function loadApis() {
  const apiSpecsPath = path.join(plugin.getPath(), 'apis');

  // This event allows to inject code before loading all APIs
  return lager.fire('beforeApisLoad')
  .then(() => {
    // Retrieve configuration path of all API specifications
    return fs.readdirAsync(apiSpecsPath);
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
    return lager.fire('afterApisLoad', apis);
  })
  .spread(apis => {
    return Promise.resolve(apis);
  })
  .catch(e => {
    if (e.code === 'ENOENT' && path.basename(e.path) === 'apis') {
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
  return lager.fire('beforeApiLoad', apiSpecPath, identifier)
  .spread((apiSpecPath, identifier) => {
    // Because we use require() to get the spec, it could either be a JSON file
    // or the content exported by a node module
    // But because require() caches the content it loads, we clone the result to avoid bugs
    // if the function is called twice
    const apiSpec = _.cloneDeep(require(apiSpecPath));
    apiSpec['x-lager'] = apiSpec['x-lager'] || {};
    const api = new Api(identifier, apiSpec);

    // This event allows to inject code to alter the API specification
    return lager.fire('afterApiLoad', api);
  })
  .spread(api => {
    return Promise.resolve(api);
  });
}

/**
 * Load all Endpoint specifications
 * @returns {Promise<[Endpoints]>} - the promise of an array containing all endpoints
 */
function loadEndpoints() {
  const endpointsDirectory = 'endpoints';
  const endpointSpecsPath = path.join(plugin.getPath(), endpointsDirectory);

  return lager.fire('beforeEndpointsLoad')
  .spread(() => {
    const endpointPromises = [];
    file.walkSync(endpointSpecsPath, (dirPath, dirs, files) => {
      // We are looking for directories that have the name of an HTTP method
      const subPath = dirPath.substr(endpointSpecsPath.length);
      const resourcePathParts = subPath.split(path.sep);
      const method = resourcePathParts.pop();
      if (['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].indexOf(method) === -1) { return; }

      // We construct the path to the resource (url style, not filesystem)
      const resourcePath = resourcePathParts.join('/');

      endpointPromises.push(loadEndpoint(endpointSpecsPath, resourcePath, method));
    });
    return Promise.all(endpointPromises);
  })
  .then(endpoints => {
    return lager.fire('afterEndpointsLoad', endpoints);
  })
  .spread(endpoints => {
    return Promise.resolve(endpoints);
  })
  .catch(e => {
    if (e.code === 'ENOENT' && path.basename(e.path) === endpointsDirectory) {
      return Promise.resolve([]);
    }
    Promise.reject(e);
  });
}

/**
 * Load an Endpoint specification
 * From the `endpointSpecRootPath` directory, lager will look for a specification in
 * each subdirectory following the structure `path/to/the/resource/HTTP_METHOD/`
 * @param {string} endpointSpecRootPath - the root directory of the endpoint configuration
 * @param {string} resourcePath - the URL path to the endpoint resource
 * @param {string} method - the HTTP method of the endpoint
 * @returns {Promise<Endpoint>} - the promise of an endpoint instance
 */
function loadEndpoint(endpointSpecRootPath, resourcePath, method) {
  // @TODO throw error if the endpoint does not exists
  method = method.toUpperCase();
  return lager.fire('beforeEndpointLoad')
  .spread(() => {
    const parts = resourcePath.split('/');
    const subPath = parts.join(path.sep) + path.sep + method;
    const spec = mergeSpecsFiles(endpointSpecRootPath, subPath);
    const endpoint = new Endpoint(spec, resourcePath, method);

    // This event allows to inject code to alter the endpoint specification
    return lager.fire('afterEndpointLoad', endpoint);
  })
  .spread((endpoint) => {
    return Promise.resolve(endpoint);
  });
}

/**
 * [function description]
 * @param {[Api]} apis - a list of APIs
 * @param {[Endpoint]} endpoints - a list of Edpoints
 * @returns {Promise<[Api]>} - the list of APIs enriched with endpoints
 */
function addEndpointsToApis(apis, endpoints) {
  return lager.fire('beforeAddEndpointsToApis', apis, endpoints)
  .spread((apis, endpoints) => {
    return Promise.map(apis, (api) => {
      return Promise.map(endpoints, (endpoint) => {
        if (api.doesExposeEndpoint(endpoint)) {
          return api.addEndpoint(endpoint);
        }
      });
    });
  })
  .then(() => {
    return lager.fire('afterAddEndpointsToApis', apis, endpoints);
  })
  .spread((apis, endpoints) => {
    return Promise.resolve(apis);
  });
}

/**
 * Integration load and deployment is performed other plugins
 * @param  {string} region - AWS region
 * @param  {string} stage - API stage
 * @param  {string} environment - environment identifier
 * @returns {[IntegrationObject]} - an array of integrqtion objects
 */
function loadIntegrations(region, context) {
  // The `deployIntegrations` hook takes two arguments
  // A object containing the region, stage and environment of the deployment
  // and nn array that will receive integration results
  return lager.fire('loadIntegrations', region, context, [])
  .spread((region, context, integrationDataInjectors) => {
    return Promise.resolve(integrationDataInjectors);
  });
}

/**
 * Update the configuration of endpoints with data returned by integration
 * This data can come from the deployment of a lambda function, the configuration
 * of an HTTP proxy, the generation of a mock etc ...
 * @param {[Endpoint]} - a list of Endpoints
 * @param {[IntegrationDataInjector]} - a list of integration data injectors
 *                                       an integration data injector is able to recognize
 *                                       if it applies to an endpoint and update its specification
 * @returns {[Endpoint]} - the list of endpoints of the application
 */
function addIntegrationDataToEndpoints(endpoints, integrationDataInjectors) {
  return lager.fire('beforeAddIntegrationDataToEndpoints', endpoints, integrationDataInjectors)
  .spread((endpoints, integrationDataInjectors) => {
    return Promise.map(integrationDataInjectors, (integrationDataInjector) => {
      return Promise.map(endpoints, (endpoint) => {
        return integrationDataInjector.applyToEndpoint(endpoint);
      });
    });
  })
  .then(() => {
    return lager.fire('afterAddIntegrationDataToEndpoints', endpoints, integrationDataInjectors);
  })
  .spread((endpoints, integrationDataInjectors) => {
    return Promise.resolve(endpoints);
  });
}

/**
 * Plublish OpenAPI specfications in API Gateway
 * @param {Array} apis - List of APIs enriched with endpoints
 * @param {string} region - AWS region where we want to deploy APIs
 * @param {Object} context - an object containing the environment and the stage to apply to the deployment
 * @return {Promise<[Api]>} - a promise of a list of published APIs
 */
function publishApis(apis, region, context) {
  return lager.fire('beforePublishApis', apis)
  .spread((apis) => {
    return Promise.map(apis, (api) => {
      return api.publish(region, context)
      .then(() => {
        return lager.fire('afterPublishApis', apis);
      });
    });
  })
  .spread((apis) => {
    return Promise.resolve(apis);
  });
}

/**
 * Deploy a list of APIs
 * @param {Array} apiIdentifiers - List of APIs identifiers
 * @param {string} region - AWS region where we want to deploy APIs
 * @param {Object} context - an object containing the environment and the stage to apply to the deployment
 * @return {Promise<[Api]>} - a promise of a list of published APIs
 */
function deploy(apiIdentifiers, region, context) {
  // First load API and endpoint specifications
  console.log('Load APIs and Endpoints');
  return Promise.all([loadApis(), loadEndpoints()])
  .spread((apis, endpoints) => {
    apis = _.filter(apis, api => { return apiIdentifiers.indexOf(api.getIdentifier()) !== -1; });
    console.log('Add endpoints to APIs');
    return Promise.all([addEndpointsToApis(apis, endpoints), endpoints]);
  })
  .spread((apis, endpoints) => {
    console.log('Load integrations');
    // The load of API and endpoint specifications succeeded, we can deploy the integrations
    // Typically, il is lambda functions, but it could be anything published by a plugin
    return Promise.all([loadIntegrations(region, context), apis, endpoints]);
  })
  .spread((integrationsDataInjectors, apis, endpoints) => {
    console.log('Add integrations to endpoints');
    // Once the integrations have been deployed we can update the endpoints with integration data
    return Promise.all([apis, addIntegrationDataToEndpoints(endpoints, integrationsDataInjectors)]);
  })
  .spread((apis, endpoints) => {
    // Now that we have complete API specifications, we can publish them in API Gateway
    return publishApis(apis, region, context);
  });
}

/**
 * Find an APIs by its identifier and return it with its endpoints
 * @param {string} identifier - the API identifier
 * @returns {Array} - the API corresponding to the  identifier
 */
function findApi(identifier) {
  return Promise.all([loadApis(), loadEndpoints()])
  .spread((apis, endpoints) => {
    const api = _.find(apis, (api) => { return api.getIdentifier() === identifier; });
    return addEndpointsToApis([api], endpoints);
  })
  .then(apis => {
    return apis[0];
  });
}

/**
 * Find an endpoint by its resource path and HTTP method
 * @param {string} resourcePath - the resource path of the endpoint
 * @param {string} method - the HTTP method of the endpoint
 * @returns {Array} - the endpoint corresponding to the resource path and the HTTP method
 */
function findEndpoint(resourcePath, method) {
  return loadEndpoints()
  .then((endpoints) => {
    return _.find(endpoints, (endpoint) => { return endpoint.getResourcePath() === resourcePath && endpoint.getMethod() === method; });
  });
}

/**
 * Enrich the lager command line
 * @returns {Promise<[program, inquirer]>} - promise of an array containing the parameters
 */
function registerCommands() {
  return Promise.all([
    require('./cli/create-api')(),
    require('./cli/create-endpoint')(),
    require('./cli/inspect-api')(),
    require('./cli/inspect-endpoint')(),
    require('./cli/deploy-apis')()
  ])
  .then(() => {
    return Promise.resolve([]);
  });
}

const plugin = {
  name: 'api-gateway',
  hooks: {
    registerCommands
  },
  helpers: {},
  loadApis,
  loadEndpoints,
  deploy,
  findApi,
  findEndpoint
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
