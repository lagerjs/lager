'use strict';

const file = require('file');
const path = require('path');
const fs = require('fs');

const Table = require('easy-table');
const Promise = require('bluebird');
const _ = require('lodash');

/**
 * Returns the path to the directory of configuration
 * @return {[type]}
 */
function getPath() {
  return path.join(process.cwd(), plugin.name);
}

/**
 * Load all API specifications
 * @returns {Promise<[Api]>} - the promise of an array containing all APIs
 */
function loadApis() {
  const apiSpecsPath = path.join(process.cwd(), plugin.config.apisPath);

  // This event allows to inject code before loading all APIs
  return plugin.lager.fire('beforeApisLoad')
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
    return plugin.lager.fire('afterApisLoad', apis);
  })
  .spread(apis => {
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
  return plugin.lager.fire('beforeApiLoad', apiSpecPath, identifier)
  .spread((apiSpecPath, identifier) => {
    // Because we use require() to get the spec, it could either be a JSON file
    // or the content exported by a node module
    // But because require() caches the content it loads, we clone the result to avoid bugs
    // if the function is called twice
    const apiSpec = _.cloneDeep(require(apiSpecPath));
    apiSpec['x-lager'] = apiSpec['x-lager'] || {};

    // Lasy loading because the plugin has to be registered in a Lager instance before requiring ./endpoint
    const Api = require('./api');
    const api = new Api(identifier, apiSpec);

    // This event allows to inject code to alter the API specification
    return plugin.lager.fire('afterApiLoad', api);
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
  const endpointSpecsPath = path.join(process.cwd(), plugin.config.endpointsPath);

  return plugin.lager.fire('beforeEndpointsLoad')
  .spread(() => {
    const endpointPromises = [];
    file.walkSync(endpointSpecsPath, (dirPath, dirs, files) => {
      // We are looking for directories that have the name of an HTTP method
      const subPath = dirPath.substr(endpointSpecsPath.length);
      const resourcePathParts = subPath.split(path.sep);
      const method = resourcePathParts.pop();
      if (['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'ANY'].indexOf(method) === -1) { return; }

      // We construct the path to the resource (url style, not filesystem)
      const resourcePath = resourcePathParts.join('/');

      endpointPromises.push(loadEndpoint(endpointSpecsPath, resourcePath, method));
    });
    return Promise.all(endpointPromises);
  })
  .then(endpoints => {
    return plugin.lager.fire('afterEndpointsLoad', endpoints);
  })
  .spread(endpoints => {
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
  return plugin.lager.fire('beforeEndpointLoad', endpointSpecRootPath, resourcePath, method)
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
      // Lasy loading because the plugin has to be registered in a Lager instance before requiring ./endpoint
      const Endpoint = require('./endpoint');
      return Promise.resolve(new Endpoint(spec, resourcePath, method));
    });
  })
  .then(endpoint => {
    // This event allows to inject code to alter the endpoint specification
    return plugin.lager.fire('afterEndpointLoad', endpoint);
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

  return plugin.lager.fire('beforeModelsLoad')
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
    return plugin.lager.fire('afterModelsLoad', models);
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
  // @TODO throw error if the model does not exists
  return plugin.lager.fire('beforeModelLoad', modelSpecPath, name)
  .spread(() => {
    // Because we use require() to get the spec, it could either be a JSON file
    // or the content exported by a node module
    // But because require() caches the content it loads, we clone the result to avoid bugs
    // if the function is called twice
    const modelSpec = _.cloneDeep(require(modelSpecPath));

    // Lasy loading because the plugin has to be registered in a Lager instance before requiring ./model
    const Model = require('./model');
    return Promise.resolve(new Model(name, modelSpec));
  })
  .then(model => {
    // This event allows to inject code to alter the model specification
    return plugin.lager.fire('afterModelLoad', model);
  })
  .spread((model) => {
    return Promise.resolve(model);
  });
}

/**
 * [function description]
 * @param {[Api]} apis - a list of APIs
 * @param {[Endpoint]} endpoints - a list of Edpoints
 * @returns {Promise<[Api]>} - the list of APIs enriched with endpoints
 */
function addEndpointsToApis(apis, endpoints) {
  return plugin.lager.fire('beforeAddEndpointsToApis', apis, endpoints)
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
    return plugin.lager.fire('afterAddEndpointsToApis', apis, endpoints);
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
  const integrationDataInjectors = [];
  return plugin.lager.fire('loadIntegrations', region, context, integrationDataInjectors)
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
  return plugin.lager.fire('beforeAddIntegrationDataToEndpoints', endpoints, integrationDataInjectors)
  .spread((endpoints, integrationDataInjectors) => {
    return Promise.map(integrationDataInjectors, (integrationDataInjector) => {
      return Promise.map(endpoints, (endpoint) => {
        return integrationDataInjector.applyToEndpoint(endpoint);
      });
    });
  })
  .then(() => {
    return plugin.lager.fire('afterAddIntegrationDataToEndpoints', endpoints, integrationDataInjectors);
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
  return plugin.lager.fire('beforePublishApis', apis)
  .spread(apis => {
    const promises = [];
    let delay = 0;
    // To avoid TooManyRequestsException, we delay the publication of each api
    _.forEach(apis, api => {
      promises.push(new Promise((resolve, reject) => {
        // 5 seconds delay
        setTimeout(() => {
          resolve(api.publish(region, context));
        }, delay * 30000);
      }));
      delay++;
    });
    return Promise.all(promises);
  })
  .then(publishResults => {
    return plugin.lager.fire('afterPublishApis', publishResults);
  })
  .spread(publishResults => {
    return Promise.resolve(publishResults);
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
  return Promise.all([loadApis(), loadEndpoints()])
  .spread((apis, endpoints) => {
    apis = _.filter(apis, api => { return apiIdentifiers.indexOf(api.getIdentifier()) !== -1; });
    return Promise.all([addEndpointsToApis(apis, endpoints), endpoints]);
  })
  .spread((apis, endpoints) => {
    const t = new Table();
    _.forEach(endpoints, endpoint => {
      t.cell('Path', endpoint.getResourcePath());
      t.cell('Method', endpoint.getMethod());
      _.forEach(endpoint.getSpec()['x-lager'].apis, apiIdentifier => {
        if (apiIdentifiers.indexOf(apiIdentifier) > -1) {
          t.cell(apiIdentifier, 'X');
        }
      });
      t.newRow();
    });
    console.log();
    console.log('Endpoints to deploy');
    console.log();
    console.log(t.toString());
    // The load of API and endpoint specifications succeeded, we can deploy the integrations
    // Typically, il is lambda functions, but it could be anything published by a plugin
    return Promise.all([loadIntegrations(region, context), apis, endpoints]);
  })
  .spread((integrationsDataInjectors, apis, endpoints) => {
    // Once the integrations have been deployed we can update the endpoints with integration data
    return Promise.all([apis, addIntegrationDataToEndpoints(endpoints, integrationsDataInjectors)]);
  })
  .spread((apis, endpoints) => {
    // Now that we have complete API specifications, we can publish them in API Gateway
    return publishApis(apis, region, context);
  })
  .then(results => {
    const t = new Table();
    _.forEach(results, result => {
      t.cell('Identifier', result.api.getIdentifier());
      t.cell('Name', result.report.name);
      t.cell('Operation', result.report.operation);
      t.cell('Stage', result.report.stage);
      t.cell('AWS identifier', result.report.awsId);
      if (result.report.failed) {
        t.cell('Url', result.report.failed);
      } else {
        t.cell('Url', 'https://' + result.report.awsId + '.execute-api.us-east-1.amazonaws.com/' + result.report.stage);
      }
      t.newRow();
    });
    console.log();
    console.log('APIs deployed');
    console.log();
    console.log(t.toString());
  });
}

/**
 * Find an APIs by its identifier and return it with its endpoints
 * @param {string} identifier - the API identifier
 * @returns {Api} - the API corresponding to the  identifier
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
 * @returns {Endpoint} - the endpoint corresponding to the resource path and the HTTP method
 */
function findEndpoint(resourcePath, method) {
  return loadEndpoints()
  .then(endpoints => {
    return _.find(endpoints, endpoint => { return endpoint.getResourcePath() === resourcePath && endpoint.getMethod() === method; });
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
    return _.find(models, model => {
      return model.getName('spec') === name;
    });
  });
}

/**
 * Enrich the lager command line
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

const plugin = {
  name: 'api-gateway',

  config: {
    apisPath: 'api-gateway' + path.sep + 'apis',
    endpointsPath: 'api-gateway' + path.sep + 'endpoints',
    modelsPath: 'api-gateway' + path.sep + 'models'
  },

  hooks: {
    registerCommands
  },

  helpers: {},
  getPath,
  loadApis,
  loadEndpoints,
  loadModels,
  deploy,
  findApi,
  findEndpoint,
  findModel,
  getAwsPermissions() {
    return require('./aws-permissions');
  }
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
  // We load the integration template that may be present in a "integration.vm" file (velocity template)
  return Promise.promisify(fs.readFile)(path.join(endpointPath, 'integration.vm'))
  .then(buffer => {
    return buffer.toString();
  })
  .catch(e => {
    console.log(e);
    return Promise.resolve(null);
  });
}
