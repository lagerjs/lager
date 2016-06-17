'use strict';

/**
 * The specification of an API endpoint
 * @param {Object} spec - OpenAPI specification of the endpoint
 * @param {string} resourcePath - path of the endpoint
 * @param {string} method - HTTP method of the endpoint
 * @constructor
 */
var Endpoint = function Endpoint(spec, resourcePath, method) {
  this.method = method;
  this.resourcePath = resourcePath;
  this.spec = spec;
};

/**
 * Returns a string representation of an Endpoint instance
 * @returns{string}
 */
Endpoint.prototype.toString =  function toString() {
  return 'Endpoint ' + this.method + ' ' + this.resourcePath;
};

/**
 * Returns the endpoint's HTTP method
 * @returns{string}
 */
Endpoint.prototype.getMethod = function getMethod() {
  return this.method;
};

/**
 * Returns the endpoint's path
 * @returns{string}
 */
Endpoint.prototype.getResourcePath = function getResourcePath() {
  return this.resourcePath;
};

/**
 * Returns the endpoint's OpenAPI specification
 * @returns{Object}
 */
Endpoint.prototype.getSpec = function getSpec() {
  return this.spec;
};

module.exports = Endpoint;
