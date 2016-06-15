'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const AWS = require('aws-sdk');
const lager = require('@lager/lager/lib/lager');

/**
 * Constructor function
 *
 * @param {Object} spec - base API specification
 */
let Api = function Api(spec) {
  this.spec = spec;
};

/**
 * Returns a string representation of an Api instance
 * @return {string}
 */
Api.prototype.toString =  function toString() {
  return 'Api ' + this.spec['x-lager'].identifier;
};

/**
 * Check if an endpoint applies to an API
 * @param {Endpoint} endpoint
 * @return {boolean}
 */
Api.prototype.doesExposeEndpoint = function doesExposeEndpoint(endpoint) {
  const spec = endpoint.getSpec();
  if (spec['x-lager'] && spec['x-lager'].apis && spec['x-lager'].apis.length) {
    return endpoint.getSpec()['x-lager'].apis.indexOf(this.spec['x-lager'].identifier) !== -1;
  }
  return false;
};

/**
 * Add an endpoint to the API
 * @param {Endpoint} endpoint
 * @return {Promise<Api>}
 */
Api.prototype.addEndpoint = function addEndpoint(endpoint) {
  return lager.fire('beforeAddEndpointToApi', this, endpoint)
  .spread((api, endpoint) => {
    // We construct the path specification
    var path = {};
    path[endpoint.getResourcePath()] = {};
    path[endpoint.getResourcePath()][endpoint.getMethod().toLowerCase()] = endpoint.getSpec();
    _.merge(this.spec.paths, path);

    // @TODO Add models referenced in the endpoint

    // @TODO Add CORS configuration
    // Create or update OPTION method if necessary
    //addCorsConfig(endpointSpecification);

    return lager.fire('afterAddEndpointToApi', this, endpoint);
  })
  .spread(() => {
    return Promise.resolve(this);
  });
};

/**
 * Generate the OpenAPI specification
 * It can be the "publish" version (for API Gateway)
 * or the "doc" version (for Swagger UI, Postman, etc...)
 * @param  {string} type - the kind of specification to generate (publish|doc)
 * @return {Object}
 */
Api.prototype.genSpec = function genSpec(type) {
  let spec = _.cloneDeep(this.spec);
  if (type === 'publish') {
    return cleanSpecForPublish(spec);
  } else if (type === 'doc') {
    return cleanSpecForDoc(spec);
  }
  return spec;
};

/**
 * Publish the API specification in API Gateway
 *
 * @return {Promise<Api>}
 */
Api.prototype.publish = function publish(region, stage, environment) {
  const awsApiGateway = new AWS.APIGateway({ region });
  return lager.fire('beforePublishApi', this)
  .spread(() => {
    return this.genSpec('publish');
  })
  .then((spec) => {
    return [getApiByName(awsApiGateway, environment + '_' + spec['x-lager'].identifier), spec];
  })
  .spread((awsApi, spec) => {
    if (awsApi) {
      return updateRestApi(awsApiGateway, spec, awsApi);
    } else {
      return createRestApi(awsApiGateway, spec, environment + '_' + spec['x-lager'].identifier);
    }
  })
  .then((awsApi) => {
    this.spec['x-lager'].id = awsApi.id;
    // WARN: awsApiGateway.putRestApi() rewrites the name of the API with the date of the import
    // We have to rewrite it correctly
    return this.setName(awsApiGateway, environment + '_' + this.spec['x-lager'].identifier);
  })
  .then(() => {
    return lager.fire('afterPublishApi', this);
  })
  .spread(() => {
    return Promise.resolve(this);
  });
};

/**
 * Set the name of the API in ApiGateway
 * @param {string} newName - the name to apply to the API in ApiGateway
 * @return {Promise<Object>} - the AWS response
 */
Api.prototype.setName = function setName(awsApiGateway, newName) {
  var params = {
    restApiId: this.spec['x-lager'].id,
    patchOperations: [{
      op: 'replace',
      path: '/name',
      value: newName
    }]
  };
  return Promise.promisify(awsApiGateway.updateRestApi.bind(awsApiGateway))(params);
};

module.exports = Api;


/**
 * We cannot find an API by name with the AWS SDK (only by ID)
 * Since we do not know the API ID but only the name, we have to list
 * all APIs and search for the name
 * Note that an API name is not necessarily unique, but we consider it should be
 * @param  {APIGateway} awsApiGateway - an API Gateway client from the AWS SDK
 * @param  {string} name - the name of the API we are looking for
 * @param  {[]} listParams - params of the awsApiGateway.getRestApis() method from the AWS SDK
 * @param  {Integer} position - used for recusive call when the list of APIs is too long
 * @return {Promise<Object|null>}
 */
function getApiByName(awsApiGateway, name, listParams, position) {
  var params = _.assign({
    position: position,
    limit: 100
  }, listParams);
  return Promise.promisify(awsApiGateway.getRestApis.bind(awsApiGateway))(params)
  .then(function(apiList) {
    var apiFound = _.find(apiList.items, function(api) {
      return api.name === name;
    });
    if (apiFound) {
      return Promise.resolve(apiFound);
    } else if (apiList.items.length === params.limit) {
      return getApiByName(awsApiGateway, name, listParams, params.position + params.limit - 1);
    } else {
      return Promise.resolve(null);
    }
  });
}

/**
 * Creates a new API in ApiGateway
 * @param  {AWS.ApiGateway} - an ApiGateway client from the AWS SDK
 * @param  {Object} apiSpec - an OpenAPI specification
 * @return {Promise<Object>} - an AWS Object representing the API
 */
function createRestApi(awsApiGateway, apiSpec, name) {
  console.log('Create Rest API ' + apiSpec['x-lager'].identifier);
  return Promise.promisify(awsApiGateway.createRestApi.bind(awsApiGateway))({ name })
  .then((awsApi) => {
    return updateRestApi(awsApiGateway, apiSpec, awsApi);
  });
}

/**
 * Creates a new API in ApiGateway
 * @param  {AWS.ApiGateway} - an ApiGateway client from the AWS SDK
 * @param  {Object} apiSpec - an OpenAPI specification
 * @param  {Object} - an AWS Object representing the API
 * @return {Promise<Object>} - an AWS Object representing the API
 */
function updateRestApi(awsApiGateway, apiSpec, awsApi) {
  console.log('Update Rest API ' + apiSpec['x-lager'].identifier);
  let params = {
    body: JSON.stringify(apiSpec),
    failOnWarnings: false,
    restApiId: awsApi.id,
    mode: 'overwrite'
  };
  return Promise.promisify(awsApiGateway.putRestApi.bind(awsApiGateway))(params);
}

/**
 * Clean an OpenAPI specification to remove parts incompatible with the ApiGateway import
 * @param  {Object} spec - an OpenAPI specification
 * @return {Object} - the OpenAPI specification cleaned
 */
function cleanSpecForPublish(spec) {
  // @TODO: see if it is still useful when importing with the SDK
  // JSON schema doesn't allow to have example as property, but swagger model does
  // https://github.com/awslabs/aws-apigateway-importer/issues/177
  _.forEach(spec.definitions, function(definition) {
    delete(definition.example);
    _.forEach(definition.properties, function(property) {
      delete(property.example);
    });
  });
  return spec;
}

/**
 * Clean an OpenAPI specification to remove parts specific to lager and ApiGateway
 * @param  {Object} spec - an OpenAPI specification
 * @return {Object} - the OpenAPI specification cleaned
 */
function cleanSpecForDoc(spec) {
  // @TODO: also delete lager extentions
  // For documentation, we can remove the OPTION methods, the lager extentions
  // and the extentions from API Gateway Importer
  _.forEach(spec.paths, function(path) {
    delete(path.options);
    _.forEach(path, function(methodDefinition) {
      delete(methodDefinition['x-amazon-apigateway-auth']);
      delete(methodDefinition['x-amazon-apigateway-integration']);
    });
  });
  return spec;
}
