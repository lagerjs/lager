'use strict';

const file = require('file');
const path = require('path');
const util = require('util');
const lager = require('@lager/lager/lib/lager');
const cardinal = require('cardinal');
const Promise = lager.getPromise();
const fs = Promise.promisifyAll(require('fs'));
const _ = lager.getLodash();

const Api = require('./api');
const Endpoint = require('./endpoint');

/**
 * Load all API specifications
 * @return {Promise<[Api]>}
 */
function loadApis() {
  let apiSpecsPath = path.join(process.cwd(), 'apis');

  // This event allows to inject code before loading all APIs
  return lager.fire('beforeApisLoad')
  .then(() => {
    // Retrieve configuration path of all API specifications
    return fs.readdirAsync(apiSpecsPath);
  })
  .then(subdirs => {
    // Load all the API specifications
    let apiPromises = [];
    _.forEach(subdirs, (subdir) => {
      let apiSpecPath = path.join(apiSpecsPath, subdir, 'spec');
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
 * @param  {string} apiSpecPath - the full path to the specification file
 * @param  {string} OPTIONAL identifier - a human readable identifier, eventually
 *                                        configured in the specification file itself
 * @return {Promise<Api>}
 */
function loadApi(apiSpecPath, identifier) {
  return lager.fire('beforeApiLoad', apiSpecPath, identifier)
  .spread((apiSpecPath, identifier) => {
    // Because we use require() to get the spec, it could either be a JSON file
    // or the content exported by a node module
    // But because require() caches the content it loads, we clone the result to avoid bugs
    // if the function is called twice
    let apiSpec = _.cloneDeep(require(apiSpecPath));
    apiSpec['x-lager'] = apiSpec['x-lager'] || {};
    apiSpec['x-lager'].identifier = apiSpec['x-lager'].identifier || identifier;
    let api = new Api(apiSpec);

    // This event allows to inject code to alter the API specification
    return lager.fire('afterApiLoad', api);
  })
  .spread(api => {
    return Promise.resolve(api);
  });
}

/**
 * Load all Endpoint specifications
 * @return {Promise<[Endpoints]>}
 */
function loadEndpoints() {
  let endpointsDirectory = 'endpoints';
  let endpointSpecsPath = path.join(process.cwd(), endpointsDirectory);

  return lager.fire('beforeEndpointsLoad')
  .spread(() => {
    let endpointPromises = [];
    file.walkSync(endpointSpecsPath, (dirPath, dirs, files) => {
      // We are looking for directories that have the name of an HTTP method
      let subPath = dirPath.substr(endpointSpecsPath.length);
      let resourcePathParts = subPath.split(path.sep);
      let method = resourcePathParts.pop();
      if (['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].indexOf(method) === -1) return;

      // We construct the path to the resource (url style, not filesystem)
      let resourcePath = resourcePathParts.join('/');

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
 *
 * From the `endpointSpecRootPath` directory, lager will look for a specification in
 * each subdirectory following the structure `path/to/the/resource/HTTP_METHOD/`
 * @param  {string} endpointSpecRootPath - the root directory of the endpoint configuration
 * @param  {string} resourcePath - the URL path to the endpoint resource
 * @param  {string} method - the HTTP method of the endpoint
 * @return {Promise<Endpoint>}
 */
function loadEndpoint(endpointSpecRootPath, resourcePath, method) {
  // @TODO throw error if the endpoint does not exists
  method = method.toUpperCase();
  return lager.fire('beforeEndpointLoad')
  .spread(() => {
    let parts = resourcePath.split('/');
    let subPath = parts.join(path.sep) + path.sep + method;
    let spec = mergeSpecsFiles(endpointSpecRootPath, subPath);
    let endpoint = new Endpoint(spec, resourcePath, method);

    // This event allows to inject code to alter the endpoint specification
    return lager.fire('afterEndpointLoad', endpoint);
  })
  .spread((endpoint) => {
    return Promise.resolve(endpoint);
  });
}

/**
 * Integration load and deployment is performed other plugins
 * @return {[IntegrationObject]} [description]
 */
function loadIntegrations(region, stage, environment) {
  // The `deployIntegrations` hook takes two arguments
  // A object containing the region, stage and environment of the deployment
  // and nn array that will receive integration results
  return lager.fire('loadIntegrations', {region, stage, environment}, [])
  .spread((config, integrationDataInjectors) => {
    return Promise.resolve(integrationDataInjectors);
  });
}

/**
 * Update the configuration of endpoints with data returned by integration
 * This data can come from the deployment of a lambda function, the configuration
 * of an HTTP proxy, the generation of a mock etc ...
 * @param  {[Endpoint]} - a list of Endpoints
 * @param  {[IntegrationDataInjector]} - a list of integration data injectors
 *                                       an integration data injector is able to recognize
 *                                       if it applies to an endpoint and update its specification
 * @return {[Endpoint]}
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
 * [function description]
 * @param  {[Api]} apis
 * @param  {[Endpoint]} endpoints
 * @return {Promise<[Api]>}
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
 * [function description]
 * @param  {[type]} apis [description]
 * @return {[type]}      [description]
 */
function publishAllApis(apis, region, stage, environment) {
  return lager.fire('beforePublishAllApis', apis)
  .spread((apis) => {
    return Promise.map(apis, (api) => {
      return api.publish(region, stage, environment)
      .then(() => {
        return lager.fire('afterPublishAllApis', apis);
      });
    });
  })
  .spread((apis) => {
    return Promise.resolve(apis);
  });
}

/**
 * Build all API specifications with their endpoints
 * @return {[Object]}
 */
function buildSpecs() {
  return Promise.all([loadApis(), loadEndpoints()])
  .spread((apis, endpoints) => {
    return Promise.map(apis, (api) => {
      return Promise.map(endpoints, (endpoint) => {
        return api.addEndpoint(endpoint);
      })
      .then(() => {
        return Promise.resolve(api);
      });
    });
  });
}

/**
 *
 * @param  {string} region - AWS where we want to deploy APIs
 * @param  {string} stage - the stage to apply to the deployment (typically, the version)
 * @param  {string} environment - the environment prefixes the API name in API Gateway
 * @return {[type]}
 */
function deploy(region, stage, environment) {
  // First load API and endpoint specifications
  console.log('Load APIs and Endpoints');
  return Promise.all([loadApis(), loadEndpoints()])
  .spread((apis, endpoints) => {
    console.log('Load integrations');
    // The load of API and endpoint specifications succeeded, we can deploy the integrations
    // Typically, il is lambda functions, but it could be anything published by a plugin
    return Promise.all([loadIntegrations(region, stage, environment), apis, endpoints]);
  })
  .spread((integrationsDataInjectors, apis, endpoints) => {
    console.log('Add integrations to endpoints');
    // Once the integrations have been deployed we can update the endpoints with integration data
    return Promise.all([apis, addIntegrationDataToEndpoints(endpoints, integrationsDataInjectors)]);
  })
  .spread((apis, endpoints) => {
    console.log('Add endpoints to APIs');
    // Once the endpoints are up-to-date with the integrations, we can add them to the APIs
    return Promise.all([addEndpointsToApis(apis, endpoints), endpoints]);
  })
  .spread((apis, endpoints) => {
    // Now that we have complete API specifications, we can publish them in API Gateway
    return publishAllApis(apis, region, stage, environment);
  });
}

function getApiSpec(identifier, type, colors) {
  type = type || 'doc';
  // @TODO identifier is not necessarily the name of the folder: it can be overriden in the spec file
  let apiSpecPath = path.join(process.cwd(), 'apis', identifier, 'spec');
  return Promise.all([loadApi(apiSpecPath, identifier), loadEndpoints()])
  .spread((api, endpoints) => {
    return Promise.all([addEndpointsToApis([api], endpoints), endpoints]);
  })
  .spread((apis, endpoints) => {
    let json = JSON.stringify(apis[0].genSpec(type), null, 2);
    if (colors) {
      json = cardinal.highlight(json, { json: true });
    }
    return json;
  });
}

function getEndpointSpec(method, resourcePath, type, colors) {
  let endpointSpecRootPath = path.join(process.cwd(), 'endpoints');
  return loadEndpoint(endpointSpecRootPath, resourcePath, method)
  .then(endpoint => {
    // @TODO create Endpoint.genSpec(type) similarly ti Api
    let json = JSON.stringify(endpoint.getSpec(), null, 2);
    if (colors) {
      json = cardinal.highlight(json, { json: true });
    }
    return json;
});
}


function registerCommands(program, inquirer) {
  return Promise.all([
    require('./cli/create-api')(program, inquirer),
    require('./cli/create-endpoint')(program, inquirer),
    require('./cli/inspect-api')(program, inquirer),
    require('./cli/inspect-endpoint')(program, inquirer),
    require('./cli/deploy-apis')(program, inquirer)
  ])
  .then(() => {
    return Promise.resolve([program, inquirer]);
  });
}

module.exports = {
  name: 'api-gateway',
  hooks: {
    registerCommands
  },
  helpers: {},
  getApiSpec,
  getEndpointSpec,
  deploy,
  loadApis,
  loadEndpoints
};


/**
 * Function that aggregates the specifications found in all spec.json|js files in a path
 * @param  {string} beginPath - path from which the function will look for swagger.json|js files
 * @param  {string} subPath - path until which the function will look for swagger.json|js files
 * @return {Object} - aggregation of specifications that have been found
 */
function mergeSpecsFiles(beginPath, subPath) {
  // Initialise specification
  let spec = {};

  // List all directories where we have to look for specifications
  let subDirs = subPath.split(path.sep);

  // Initialize the directory path for the do/while statement
  let searchSpecDir = beginPath;

  do {
    let subSpec = {};
    let subDir = subDirs.shift();
    searchSpecDir = path.join(searchSpecDir, subDir);

    try {
      // Try to load the definition and silently ignore the error if it does not exist
      // Because we use require() to get the config, it could either be a JSON file
      // or the content exported by a node module
      // But because require() caches the content it loads, we clone the result to avoid bugs
      // if the function is called twice
      subSpec = _.cloneDeep(require(searchSpecDir + path.sep + 'spec'));
    } catch (e) {}

    // Merge the spec eventually found
    _.merge(spec, subSpec);
  } while (subDirs.length);

  // return the result of the merges
  return spec;
}
