'use strict';

const AWS = require('aws-sdk');
const Promise = require('bluebird');
const _ = require('lodash');

const plugin = require('./index');

/**
 * Represents an API
 * @constructor
 * @param {Object} spec - base API specification (Swagger/OpenAPI specification)
 */
const Api = function Api(spec, identifier) {
  this.spec = spec;
  this.identifier = identifier;
  this.endpoints = [];
  this.models = [];
};

/**
 * Perform async operations to init the API instance
 * @returns {string}
 */
Api.prototype.init = function init() {
  return plugin.loadEndpoints()
  .then(endpoints => {
    return this.addEndpoints(endpoints);
  });
};

/**
 * Returns the API identifier in the Myrmex project
 * @returns {string}
 */
Api.prototype.getIdentifier = function getIdentifier() {
  return this.identifier;
};

/**
 * Returns a string representation of an Api instance
 * @returns {string}
 */
Api.prototype.toString = function toString() {
  return 'API ' + this.identifier;
};

/**
 * Returns the API's Swagger/OpenAPI specification
 * @returns {Object} - a portion of Swagger/OpenAPI specification describing the API
 */
Api.prototype.getSpec = function getSpec() {
  return this.spec;
};

/**
 * Check if an endpoint applies to an API
 * @param {Endpoint} endpoint
 * @returns {boolean}
 */
Api.prototype.doesExposeEndpoint = function doesExposeEndpoint(endpoint) {
  const spec = endpoint.getSpec();
  if (spec['x-myrmex'] && spec['x-myrmex'].apis && spec['x-myrmex'].apis.length) {
    return endpoint.getSpec()['x-myrmex'].apis.indexOf(this.identifier) !== -1;
  }
  return false;
};

/**
 * Add a list of endpoints to the API
 * @param {Endpoint} endpoint
 * @param {boolean} force
 * @returns {Promise<Api>}
 */
Api.prototype.addEndpoints = function addEndpoints(endpoints, force) {
  return plugin.myrmex.fire('beforeAddEndpointsToApi', this, endpoints)
  .spread((api, endpoints) => {
    return Promise.map(endpoints, (endpoint) => {
      return this.addEndpoint(endpoint, force);
    });
  })
  .then(() => {
    return plugin.myrmex.fire('afterAddEndpointsToApi', this, endpoints);
  })
  .spread((api, endpoints) => {
    return Promise.resolve(this);
  });
};

/**
 * Add an endpoint to the API
 * @param {Endpoint} endpoint
 * @param {boolean} force
 * @returns {Promise<Api>}
 */
Api.prototype.addEndpoint = function addEndpoint(endpoint, force) {
  // If the endpoint is not supposed to be exposed by the API, we skip it
  if (force !== true && !this.doesExposeEndpoint(endpoint)) {
    return Promise.resolve(this);
  }

  return plugin.myrmex.fire('beforeAddEndpointToApi', this, endpoint)
  .spread((api, endpoint) => {
    // We add the API indentifier to the configuration of the endpoint
    // in case "force" has been used
    if (force) {
      endpoint.getSpec()['x-myrmex'] = endpoint.getSpec()['x-myrmex'] || {};
      endpoint.getSpec()['x-myrmex'].apis = endpoint.getSpec()['x-myrmex'].apis || [];
      if (endpoint.getSpec()['x-myrmex'].apis.indexOf(this.getIdentifier()) === -1) {
        endpoint.getSpec()['x-myrmex'].apis.push(this.getIdentifier());
      }
    }
    this.endpoints.push(endpoint);
    return endpoint.getReferencedModels();
  })
  .then(models => {
    // Add models referenced in the endpoint to the list of models of the API
    _.forEach(models, model => {
      const index = _.findIndex(this.models, m => {
        return m.getName() === model.getName();
      });
      if (index === -1) {
        this.models.push(model);
      }
    });
    return plugin.myrmex.fire('afterAddEndpointToApi', this, endpoint);
  })
  .spread(() => {
    return Promise.resolve(this);
  });
};

/**
 * Return the list of endpoints of the API
 * @returns {Promise<[Endpoint]>}
 */
Api.prototype.getEndpoints = function getEndpoints() {
  return this.endpoints;
};

/**
 * Generate a Swagger/OpenAPI specification
 * It can be the "api-gateway" version (for publication in API Gateway)
 * or the "doc" version (for Swagger UI, Postman, etc...)
 * or a complete, unaltered version for debugging
 * @param {string} type - the kind of specification to generate (api-gateway|doc)
 * @param {Object} context - a object containing the stage and the environment
 * @returns {Object}
 */
Api.prototype.generateSpec = function generateSpec(type, context) {
  const spec = _.cloneDeep(this.spec);

  // Add endpoint specifications
  _.forEach(this.endpoints, endpoint => {
    // We create the new "path" entry and merge it to specification
    const path = {};
    const resourcePath = endpoint.getResourcePath();
    const method = endpoint.getMethod().toLowerCase();
    path[resourcePath] = {};
    if (method === 'any' && type === 'api-gateway') {
      path[resourcePath]['x-amazon-apigateway-any-method'] = endpoint.generateSpec(type);
    } else if (method === 'any' && type === 'doc') {
      ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].forEach(m => {
        path[resourcePath][m] = endpoint.generateSpec(type);
      });
    } else {
      path[resourcePath][method] = endpoint.generateSpec(type);
    }
    _.merge(spec.paths, path);
  });

  // Add model specifications
  // We need to include child models in the specification
  return Promise.map(this.models, model => {
    return Promise.all([model, model.getNestedModelsList()])
    .spread((model, nestedModelsList) => {
      // We add the model itself to the list of its nested models
      nestedModelsList.push(model);
      return nestedModelsList;
    });
  })
  .then(modelsLists => {
    // Merge the models lists
    const models = _.concat.apply(null, modelsLists);
    _.forEach(models, model => {
      spec.definitions[model.getName('spec')] = model.getSpec();
    });

    // Depending on the type of specification we want, we may do some cleanup
    if (type === 'api-gateway') {
      // Inject myrmex identification data in the API name
      if (context) {
        spec.info.title = context.environment + ' ' + this.identifier + ' - ' + spec.info.title;
      }
      return cleanSpecForApiGateway(spec);
    } else if (type === 'doc') {
      return cleanSpecForDoc(spec);
    }
    return spec;
  });
};

/**
 * Publish the API specification in API Gateway
 * @returns {Promise<Api>}
 */
Api.prototype.publish = function publish(region, context) {
  const awsApiGateway = new AWS.APIGateway({ region });
  return plugin.myrmex.fire('beforePublishApi', this)
  .spread(() => {
    // Retrieve the API in AWS API Gateway
    return this.findInApiGateway(awsApiGateway, context);
  })
  .then(awsApi => {
    const params = {
      restApiId: awsApi.id,
      stageName: context.stage
    };
    return Promise.promisify(awsApiGateway.createDeployment.bind(awsApiGateway))(params);
  })
  .then((res) => {
    return plugin.myrmex.fire('afterDeployApi', this);
  })
  .spread(() => {
    return this;
  });
};

/**
 * Publish the API specification in API Gateway
 * @returns {Promise<Api>}
 */
Api.prototype.deploy = function deploy(region, context) {
  const awsApiGateway = new AWS.APIGateway({ region });
  const report = {};

  return plugin.myrmex.fire('beforeDeployApi', this)
  .spread(() => {
    // Generate the specification to deploy
    return this.generateSpec('api-gateway', context);
  })
  .then(spec => {
    return Promise.all([
      // Retrieve the API in AWS API Gateway
      this.findInApiGateway(awsApiGateway, context),
      // Set IAM roles arns in endpoints specifications
      applyCredentialsARNs(spec, context)
    ]);
  })
  .spread((awsApi, spec) => {
    if (awsApi) {
      report.operation = 'Update';
      return this._updateInApiGateway(awsApiGateway, spec, context, awsApi);
    }
    report.operation = 'Creation';
    return this._createInApiGateway(awsApiGateway, spec, context);
  })
  .then(awsApi => {
    report.awsId = awsApi.id;
    report.name = awsApi.name;
    report.description = awsApi.description;
    report.stage = context.stage;
    report.region = region;
    return plugin.myrmex.fire('afterDeployApi', this);
  })
  .spread(() => {
    return Promise.resolve({
      report: report,
      api: this
    });
  })
  .catch(e => {
    plugin.myrmex.log.fatal(e, 'The deployment of ' + this.getIdentifier() + ' failed');
    report.failed = 'DEPLOYMENT FAILED - ' + e.code;
    return Promise.resolve({
      report: report,
      api: this
    });
  });
};


/**
 * We cannot find an API by name with the AWS SDK (only by ID)
 * We do not know the API ID but Myrmex inject identification content in the name
 * We have to list all APIs and return the first one having a name that matches
 * @param {APIGateway} awsApiGateway - an API Gateway client from the AWS SDK
 * @param {Object} context - an object containing information about the environment of the API we are searching
 * @param {[]} listParams - params of the awsApiGateway.getRestApis() method from the AWS SDK
 * @param {Integer} position - used for recusive call when the list of APIs is too long
 * @returns {Promise<Object|null>}
 */
Api.prototype.findInApiGateway = function findInApiGateway(awsApiGateway, context, position) {
  const params = {
    position,
    limit: 100
  };
  return Promise.promisify(awsApiGateway.getRestApis.bind(awsApiGateway))(params)
  .then(apiList => {
    const apiFound = _.find(apiList.items, api => {
      return this._findIdentificationInName(api.name, context);
    });
    if (apiFound) {
      return Promise.resolve(apiFound);
    } else if (apiList.items.length === params.limit) {
      return this.findInApiGateway(awsApiGateway, context, params.position + params.limit - 1);
    }
    return Promise.resolve(null);
  });
};

Api.prototype._findIdentificationInName = function _findIdentificationInName(name, context) {
  const identification = context.environment + ' ' + this.identifier + ' - ';
  return _.startsWith(name, identification);
};

/**
 * Creates a new API in ApiGateway
 * @param {AWS.ApiGateway} - an ApiGateway client from the AWS SDK
 * @param {Object} apiSpec - an Swagger/OpenAPI specification
 * @returns {Promise<Object>} - an AWS Object representing the API
 */
Api.prototype._createInApiGateway = function _createInApiGateway(awsApiGateway, spec, context) {
  const params = {
    body: JSON.stringify(spec),
    failOnWarnings: false
  };
  return Promise.promisify(awsApiGateway.importRestApi.bind(awsApiGateway))(params);
};

/**
 * Creates a new API in ApiGateway
 * @param {AWS.ApiGateway} - an ApiGateway client from the AWS SDK
 * @param {Object} apiSpec - an Swagger/OpenAPI specification
 * @param {Object} - an AWS Object representing the API
 * @returns {Promise<Object>} - an AWS Object representing the API
 */
Api.prototype._updateInApiGateway = function _updateInApiGateway(awsApiGateway, spec, context, awsApi) {
  const params = {
    body: JSON.stringify(spec),
    failOnWarnings: false,
    restApiId: awsApi.id,
    mode: 'overwrite'
  };
  return Promise.promisify(awsApiGateway.putRestApi.bind(awsApiGateway))(params);
};

module.exports = Api;

/**
 * Clean an Swagger/OpenAPI specification to remove parts incompatible with the ApiGateway import
 * @param {Object} spec - an Swagger/OpenAPI specification
 * @returns {Object} - the cleaned Swagger/OpenAPI specification
 */
function cleanSpecForApiGateway(spec) {
  // @TODO: see if it is still useful when importing with the SDK
  // JSON schema doesn't allow to have example as property, but swagger model does
  // https://github.com/awslabs/aws-apigateway-importer/issues/177
  delete spec['x-myrmex'];
  _.forEach(spec.definitions, definition => {
    delete definition.example;
    _.forEach(definition.properties, property => {
      delete property.example;
    });
  });
  return spec;
}

/**
 * Clean an Swagger/OpenAPI specification to remove parts specific to myrmex and ApiGateway
 * @param {Object} spec - an Swagger/OpenAPI specification
 * @returns {Object} - the cleaned Swagger/OpenAPI specification
 */
function cleanSpecForDoc(spec) {
  // For documentation, we can remove the OPTION methods, the myrmex extentions
  // and the extentions from API Gateway Importer
  delete spec['x-myrmex'];
  // _.forEach(spec.paths, path => {
  //   delete path.options;
  // });
  return spec;
}

/**
 * Replace role references in an Swagger/OpenAPI spec by their ARN
 * @param  {Object} spec - an Swagger/OpenAPI specification that will be imported in AWS
 * @return {Object} - the altered specification
 */
function applyCredentialsARNs(spec, context) {
  // Retrieve values for integration credentials
  const credentials = _.reduce(spec.paths, (r1, endpointSpecs, resourcePath) => {
    const r2 = _.reduce(endpointSpecs, (r2, endpointSpec, method) => {
      if (endpointSpec['x-amazon-apigateway-integration'].credentials && r2.indexOf(endpointSpec['x-amazon-apigateway-integration'].credentials) === -1) {
        r2.push(endpointSpec['x-amazon-apigateway-integration'].credentials);
      }
      return r2;
    }, []);
    return _.concat(r1, r2);
  }, []);

  // Retrieve ARN for each credential
  return Promise.map(credentials, credential => {
    // The @myrmex/iam plugin can help to convert an indentifier into an ARN
    // If @myrmex/iam is not installed, the correct ARN has to be provided
    return plugin.myrmex.call('iam:retrieveRoleArn', credential, context, credential)
    .then(arn => {
      return { identifier: credential, arn };
    });
  })
  .then(credentialsMap => {
    // Replace names by ARNs in the spec
    _.forEach(spec.paths, endpointSpecs => {
      _.forEach(endpointSpecs, endpointSpec => {
        if (endpointSpec['x-amazon-apigateway-integration'].credentials) {
          endpointSpec['x-amazon-apigateway-integration'].credentials = _.find(credentialsMap, o => {
            return o.identifier === endpointSpec['x-amazon-apigateway-integration'].credentials; }
          ).arn;
        }
      });
    });
    return spec;
  });
}
