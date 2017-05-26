'use strict';

const _ = require('lodash');

const plugin = require('./index');

/**
 * The specification of an API endpoint
 * @param {Object} spec - Swagger/OpenAPI specification of the endpoint
 * @param {string} resourcePath - path of the endpoint
 * @param {string} method - HTTP method of the endpoint
 * @constructor
 */
const Endpoint = function Endpoint(spec, resourcePath, method) {
  this.method = method;
  this.resourcePath = resourcePath || '/';
  this.spec = spec;
};

/**
 * Returns a string representation of an Endpoint instance
 * @returns {string} -  a string representation of an endpoint instance
 */
Endpoint.prototype.toString = function toString() {
  return 'Endpoint ' + this.method + ' ' + this.resourcePath;
};

/**
 * Returns the endpoint's HTTP method
 * @returns {string} - an HTTP method
 */
Endpoint.prototype.getMethod = function getMethod() {
  return this.method;
};

/**
 * Returns the endpoint's path
 * @returns {string} - the resource path of the endpoint
 */
Endpoint.prototype.getResourcePath = function getResourcePath() {
  return this.resourcePath;
};

/**
 * Returns the names of the models referenced in the endpoint
 * @returns {Array[string]}
 */
Endpoint.prototype.getReferencedModels = function getReferencedModels() {
  const modelRefs = [];
  if (this.spec.responses) {
    _.forEach(this.spec.responses, response => {
      if (response.schema && response.schema.$ref) {
        modelRefs.push(response.schema.$ref);
      }
    });
  }
  if (this.spec.parameters) {
    _.forEach(this.spec.parameters, parameter => {
      if (parameter.schema && parameter.schema.$ref) {
        modelRefs.push(parameter.schema.$ref);
      }
    });
  }

  const modelNames = _.map(_.uniq(modelRefs), modelRef => {
    return modelRef.replace('#/definitions/', '');
  });

  return Promise.map(modelNames, modelName => {
    return plugin.findModel(modelName);
  });
};

/**
 * Returns the endpoint's Swagger/OpenAPI specification
 * @returns {Object} - a portion of Swagger/OpenAPI specification describing the endpoint
 */
Endpoint.prototype.getSpec = function getSpec() {
  return this.spec;
};

/**
 * Generate a portion of Swagger/OpenAPI specification
 * It can be the "api-gateway" version (for publication in API Gateway)
 * or the "doc" version (for Swagger UI, Postman, etc...)
 * or a complete, unaltered version for debugging
 * @param {string} type - the kind of specification to generate (api-gateway|doc)
 * @returns {Object} - a portion of Swagger/OpenAPI specification describing the endpoint
 */
Endpoint.prototype.generateSpec = function generateSpec(type) {
  const spec = _.cloneDeep(this.spec);

  // Depending on the type of specification we want, we may do some cleanup
  if (type === 'api-gateway') {
    return cleanSpecForApiGateway(spec);
  } else if (type === 'doc') {
    return cleanSpecForDoc(spec);
  }
  return spec;
};

module.exports = Endpoint;

/**
 * Clean a specification to remove parts incompatible with the ApiGateway import
 * @param {Object} spec - an Swagger/OpenAPI specification
 * @returns {Object} - the cleaned Swagger/OpenAPI specification
 */
function cleanSpecForApiGateway(spec) {
  delete spec['x-myrmex'];
  return spec;
}

/**
 * Clean a specification to remove parts specific to myrmex and ApiGateway
 * @param {Object} spec - an Swagger/OpenAPI specification
 * @returns {Object} - the cleaned Swagger/OpenAPI specification
 */
function cleanSpecForDoc(spec) {
  // For documentation, we can remove the OPTION methods, the myrmex extentions
  // and the extentions from API Gateway Importer
  delete spec['x-myrmex'];
  delete spec['x-amazon-apigateway-auth'];
  delete spec['x-amazon-apigateway-integration'];
  return spec;
}
