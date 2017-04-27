'use strict';

const path = require('path');
const _ = require('lodash');
const baseSpec = require('./spec');

module.exports = () => {

  return (api) => {
    const plugin = require('..');
    const Endpoint = plugin.lager.getPlugin('api-gateway').getEndpointConstructor();
    const optionsEndpoints = [];
    const endpoints = api.getEndpoints();

    // We retrieve the project level configuration
    const apiCors = JSON.parse(JSON.stringify(plugin.config));

    // We retrieve the API level configuration and add it to the project configuration
    const apiSpec = api.getSpec();
    if (apiSpec['x-lager'] && apiSpec['x-lager'].cors) {
      Object.assign(apiCors, apiSpec['x-lager'].cors);
    }

    // For each endpoint path, we check there is a specific configuration
    const resourcePaths = _.uniq(_.map(endpoints, e => e.getResourcePath()));
    resourcePaths.forEach(resourcePath => {
      // We retrieve all methods for the resource path
      const rpEndpoints = _.filter(endpoints, e => e.getResourcePath() === resourcePath);

      // We check if an OPTION endpoint already exists
      if (_.find(rpEndpoints, e => e.getMethod === 'OPTIONS')) {
        // If an OPTION enpoint already exist, we skip this resource path
        // The user should configure CORS himself because we do not want to alter his endpoint
        // configuration / integration without knowing if it would break something
        return;
      }

      // We initialise the resource path level configuration with the API level one
      const cors = JSON.parse(JSON.stringify(apiCors));

      // We check if there is specific configuration for this resource path
      try {
        const resourcePathCors = require(path.join(process.cwd(), plugin.lager.getConfig('apiGateway.endpointsPath'), resourcePath, 'cors'));
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
      const spec = JSON.parse(JSON.stringify(baseSpec));
      // We add the CORS headers to the OPTION endpoint
      _.forEach(cors, (value, key) => {
        // We add the configuration to Swagger
        spec.responses['200'].headers[key] = { type: 'string' };
        // We add the configuration to the API Gateway Swagger extention for integration
        if (key === 'Access-Control-Allow-Methods') {
          // For Access-Control-Allow-Method, we remove "ANY" that is specific to API Gateway
          const arrayValue = value.split(',');
          const anyIndex = arrayValue.indexOf('ANY');
          if (anyIndex !== -1) {
            arrayValue.splice(anyIndex, 1);
            value = arrayValue.join(',');
          }
        }
        spec['x-amazon-apigateway-integration'].responses.default.responseParameters['method.response.header.' + key] = "'" + value + "'";
      });
      const optionsEndpoint = new Endpoint(spec, resourcePath, 'OPTIONS');
      optionsEndpoints.push(optionsEndpoint);

      // Now that the OPTION endpoint has been created, we also update the configuration of http methods that are specified in "Access-Control-Allow-Methods"
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
    });

    // We add created endpoints to the API
    return Promise.map(optionsEndpoints, oe => api.addEndpoint(oe, true))
    .then(() => {
      return Promise.resolve(api);
    });
  };

};
