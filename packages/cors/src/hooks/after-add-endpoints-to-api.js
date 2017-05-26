'use strict';

const path = require('path');
const _ = require('lodash');
const baseSpec = require('./spec');

module.exports = () => {

  return (api) => {
    const plugin = require('..');
    const optionsEndpoints = [];
    const endpoints = api.getEndpoints();

    // We retrieve the project level configuration
    const apiCors = JSON.parse(JSON.stringify(plugin.config));

    // We retrieve the API level configuration and add it to the project configuration
    const apiSpec = api.getSpec();
    if (apiSpec['x-myrmex'] && apiSpec['x-myrmex'].cors) {
      Object.assign(apiCors, apiSpec['x-myrmex'].cors);
    }

    // For each endpoint path, we check there is a specific configuration
    const resourcePaths = _.uniq(_.map(endpoints, e => e.getResourcePath()));
    resourcePaths.forEach(resourcePath => {
      // We retrieve all methods for the resource path
      const rpEndpoints = _.filter(endpoints, e => e.getResourcePath() === resourcePath);

      // We check if an OPTION endpoint already exists
      if (_.find(rpEndpoints, e => e.getMethod() === 'OPTIONS')) {
        // If an OPTION enpoint already exist, we skip this resource path
        // The user should configure CORS himself because we do not want to alter his endpoint
        // configuration / integration without knowing if it would break something
        return;
      }

      // We initialise the resource path level configuration with the API level one
      const cors = JSON.parse(JSON.stringify(apiCors));

      // We check if there is specific configuration for this resource path
      try {
        const resourcePathCors = require(path.join(process.cwd(), plugin.myrmex.getConfig('apiGateway.endpointsPath'), resourcePath, 'cors'));
        // We retrieve the configuration for this resource path and add it to the configuration
        Object.assign(cors, resourcePathCors.default || {});
        // We retrieve the configuration for this resource path for the API if it exist and add it to the configuration
        Object.assign(cors, resourcePathCors[api.getIdentifier()] || {});
      } catch (e) {
        // Ignore if no specific configuration has been found
        // Propagate other errors
        if (e.code !== 'MODULE_NOT_FOUND') { throw e; }
      }

      // At this point we merged 4 possible levels of configuration:
      // * project level
      // * API level
      // * Resource path level
      // * Resource path level for the current API
      // We now can create an OPTION endpoint that will contain the CORS configuration for the resource path

      // We create the OPTIONS method for the resource path
      // and add it to the API (this operation is asynchronous, we store the promise for later)
      optionsEndpoints.push(createOptionsEndpoint(cors, resourcePath, rpEndpoints.map(e => e.getMethod())));

      // Now that the OPTION endpoint has been created, we also update the configuration of http methods that are specified in "Access-Control-Allow-Methods"
      updateEndpoints(cors, rpEndpoints);
    });

    // We add created endpoints to the API
    return Promise.map(optionsEndpoints, oe => api.addEndpoint(oe, true))
    .then(() => {
      return Promise.resolve(api);
    });
  };

};


function createOptionsEndpoint(cors, resourcePath, definedMethods) {
  const plugin = require('..');
  const Endpoint = plugin.myrmex.getPlugin('api-gateway').getEndpointConstructor();

  const spec = JSON.parse(JSON.stringify(baseSpec));
  // We add the CORS headers to the OPTION endpoint
  _.forEach(cors, (value, key) => {
    // We add the configuration to Swagger
    spec.responses['200'].headers[key] = { type: 'string' };
    // We add the configuration to the API Gateway Swagger extention for integration
    if (key === 'Access-Control-Allow-Methods') {
      // The list of HTTP methods that will returned in the header Access-Control-Allow-Methods is the intersection of
      // * the methods defined for the resource path
      // * the methods configured for the cors plugin
      // So we do not give a response that contains unimplemented HTTP methods
      const configuredMethods = _.intersection(value.split(','), definedMethods);
      // For Access-Control-Allow-Methods, we remove "ANY" that is specific to API Gateway and add all methods covered by ANY
      if (configuredMethods.indexOf('ANY') !== -1) {
        // If ANY is part of the "allow methods" configuration, we init the list with all http methods managed by API Gateway
        const allowedMethods = JSON.parse(JSON.stringify(plugin.myrmex.getPlugin('api-gateway').httpMethods));
        // We exclude methods that have a endpoint explicitely defined (that means method definitions that override the ANY definition)
        // but are not present in the cors configuration
        definedMethods.forEach(method => {
          if (configuredMethods.indexOf(method) === -1) {
            const methodIndex = allowedMethods.indexOf(method);
            allowedMethods.splice(methodIndex, 1);
          }
        });
        // We remove ANY from the list of method as it is not an expected value for the header 'Access-Control-Allow-Methods'
        const anyIndex = allowedMethods.indexOf('ANY');
        allowedMethods.splice(anyIndex, 1);
        value = allowedMethods.join(',');
      } else {
        value = configuredMethods;
      }
    }
    spec['x-amazon-apigateway-integration'].responses.default.responseParameters['method.response.header.' + key] = "'" + value + "'";
  });
  return new Endpoint(spec, resourcePath, 'OPTIONS');
}


function updateEndpoints(cors, rpEndpoints) {
  const allowedMethod = cors['Access-Control-Allow-Methods'].split(',');
  allowedMethod.forEach(method => {
    if (method === 'OPTIONS') { return; }
    const endpoint = _.find(rpEndpoints, e => e.getMethod() === method);
    if (endpoint) {
      // We add the configuration to Swagger
      _.forEach(endpoint.getSpec().responses, (spec) => {
        spec.headers = spec.headers || {};
        spec.headers['Access-Control-Allow-Origin'] = spec.headers['Access-Control-Allow-Origin'] || { type: 'string' };
      });
      // We add the configuration to the API Gateway Swagger extention for integration
      _.forEach(endpoint.getSpec()['x-amazon-apigateway-integration'].responses, (spec, responseCode) => {
        spec.responseParameters = spec.responseParameters || {};
        spec.responseParameters['method.response.header.Access-Control-Allow-Origin']
          = spec.responseParameters['method.response.header.Access-Control-Allow-Origin'] || '\'' + cors['Access-Control-Allow-Origin'] + '\'';
      });
    }
  });
}
