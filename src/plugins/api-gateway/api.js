'use strict';

// Nice ES6 syntax
// const { Promise, _, icli } = require('@lager/lager/lib/lager').import;
const lager = require('@lager/lager/lib/lager');
const _ = lager.import._;
const Promise = lager.import.Promise;

const AWS = require('aws-sdk');

/**
 * Represents an API
 * @constructor
 * @param {Object} spec - base API specification (OpenAPI specification)
 */
const Api = function Api(identifier, spec) {
  this.identifier = identifier;
  this.spec = spec;
  this.endpoints = [];
};

/**
 * Returns the API identifier in the Lager project
 * @returns{string}
 */
Api.prototype.getIdentifier = function getIdentifier() {
  return this.identifier;
};

/**
 * Returns a string representation of an Api instance
 * @returns{string}
 */
Api.prototype.toString = function toString() {
  return 'Api ' + this.identifier;
};

/**
 * Check if an endpoint applies to an API
 * @param {Endpoint} endpoint
 * @returns{boolean}
 */
Api.prototype.doesExposeEndpoint = function doesExposeEndpoint(endpoint) {
  const spec = endpoint.getSpec();
  if (spec['x-lager'] && spec['x-lager'].apis && spec['x-lager'].apis.length) {
    return endpoint.getSpec()['x-lager'].apis.indexOf(this.identifier) !== -1;
  }
  return false;
};

/**
 * Add an endpoint to the API
 * @param {Endpoint} endpoint
 * @returns{Promise<Api>}
 */
Api.prototype.addEndpoint = function addEndpoint(endpoint) {
  return lager.fire('beforeAddEndpointToApi', this, endpoint)
  .spread((api, endpoint) => {
    this.endpoints.push(endpoint);
    // @TODO Add models referenced in the endpoint
    // @TODO Add CORS configuration (with a separate plugin)
    return lager.fire('afterAddEndpointToApi', this, endpoint);
  })
  .spread(() => {
    return Promise.resolve(this);
  });
};

/**
 * Generate an OpenAPI specification
 * It can be the "api-gateway" version (for publication in API Gateway)
 * or the "doc" version (for Swagger UI, Postman, etc...)
 * or a complete, unaltered version for debugging
 * @param {string} type - the kind of specification to generate (api-gateway|doc)
 * @returns{Object}
 */
Api.prototype.generateSpec = function generateSpec(type, context) {
  const spec = _.cloneDeep(this.spec);

  // Add endpoint specifications
  _.forEach(this.endpoints, endpoint => {
    // We create the new "path" entry and merge it to specification
    const path = {};
    path[endpoint.getResourcePath()] = {};
    path[endpoint.getResourcePath()][endpoint.getMethod().toLowerCase()] = endpoint.generateSpec();
    _.merge(this.spec.paths, path);
  });

  // Depending on the type of specification we want, we may do some cleanup
  if (type === 'api-gateway') {
    // Inject lager identification data in the API name
    spec.info.title = context.environment + ' ' + this.identifier + ' - ' + spec.info.title;
    return cleanSpecForApiGateway(spec);
  } else if (type === 'doc') {
    return cleanSpecForDoc(spec);
  }
  return spec;
};

/**
 * Publish the API specification in API Gateway
 *
 * @returns{Promise<Api>}
 */
Api.prototype.publish = function publish(region, context) {
  const awsApiGateway = new AWS.APIGateway({ region });
  return lager.fire('beforePublishApi', this)
  .spread(() => {
    // Retrieve the API in AWS API Gateway
    return this.findInApiGateway(awsApiGateway, context);
  })
  .then(awsApi => {
    if (awsApi) {
      return this._updateInApiGateway(awsApiGateway, context, awsApi);
    }
    return this._createInApiGateway(awsApiGateway, context);
  })
  .then(() => {
    return lager.fire('afterPublishApi', this);
  })
  .spread(() => {
    return Promise.resolve(this);
  });
};


/**
 * We cannot find an API by name with the AWS SDK (only by ID)
 * We do not know the API ID but Lager inject identification content in the name
 * We have to list all APIs and return the first one having a name that matches
 * @param {APIGateway} awsApiGateway - an API Gateway client from the AWS SDK
 * @param {Object} context - an object containing information about the environment of the API we are searching
 * @param {[]} listParams - params of the awsApiGateway.getRestApis() method from the AWS SDK
 * @param {Integer} position - used for recusive call when the list of APIs is too long
 * @returns{Promise<Object|null>}
 */
Api.prototype.findInApiGateway = function findInApiGateway(awsApiGateway, context, position) {
  const params = {
    position: position,
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
 * @param {Object} apiSpec - an OpenAPI specification
 * @returns{Promise<Object>} - an AWS Object representing the API
 */
Api.prototype._createInApiGateway = function _createInApiGateway(awsApiGateway, context) {
  const spec = this.generateSpec('api-gateway', context);
  console.log('Create API ' + spec.info.title);
  const params = {
    body: JSON.stringify(spec),
    failOnWarnings: false
  };
  return Promise.promisify(awsApiGateway.importRestApi.bind(awsApiGateway))(params);
};

/**
 * Creates a new API in ApiGateway
 * @param {AWS.ApiGateway} - an ApiGateway client from the AWS SDK
 * @param {Object} apiSpec - an OpenAPI specification
 * @param {Object} - an AWS Object representing the API
 * @returns{Promise<Object>} - an AWS Object representing the API
 */
Api.prototype._updateInApiGateway = function _updateInApiGateway(awsApiGateway, context, awsApi) {
  const spec = this.generateSpec('api-gateway', context);
  console.log('Update API ' + spec.info.title);
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
 * Clean an OpenAPI specification to remove parts incompatible with the ApiGateway import
 * @param {Object} spec - an OpenAPI specification
 * @returns{Object} - the cleaned OpenAPI specification
 */
function cleanSpecForApiGateway(spec) {
  // @TODO: see if it is still useful when importing with the SDK
  // JSON schema doesn't allow to have example as property, but swagger model does
  // https://github.com/awslabs/aws-apigateway-importer/issues/177
  delete spec['x-lager'];
  _.forEach(spec.definitions, definition => {
    delete definition.example;
    _.forEach(definition.properties, property => {
      delete property.example;
    });
  });
  return spec;
}

/**
 * Clean an OpenAPI specification to remove parts specific to lager and ApiGateway
 * @param {Object} spec - an OpenAPI specification
 * @returns{Object} - the cleaned OpenAPI specification
 */
function cleanSpecForDoc(spec) {
  // For documentation, we can remove the OPTION methods, the lager extentions
  // and the extentions from API Gateway Importer
  delete spec['x-lager'];
  _.forEach(spec.paths, path => {
    delete path.options;
    _.forEach(path, method => {
      delete method['x-amazon-apigateway-auth'];
      delete method['x-amazon-apigateway-integration'];
    });
  });
  return spec;
}
