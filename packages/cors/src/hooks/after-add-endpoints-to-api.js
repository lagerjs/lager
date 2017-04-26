'use strict';

const path = require('path');
const _ = require('lodash');

const baseSpec = require('./spec');

module.exports = (plugin) => {

  return (api) => {
    const Endpoint = plugin.lager.getPlugin('api-gateway').getEndpointConstructor();

    // Check if the API has a CORS configuration
    const apiSpec = api.getSpec();
    const apiCors = apiSpec['x-lager'] && apiSpec['x-lager'].cors ? apiSpec['x-lager'].cors : {};

    const addEndpointPromises = [];

    // Check if each endpoint has a CORS config
    const endpoints = api.getEndpoints();
    const resourcePaths = _.uniq(_.map(endpoints, e => e.getResourcePath()));
    resourcePaths.forEach(resourcePath => {
      // We check that there is not an OPTION endpoint already
      if (!_.find(endpoints, e => e.getMethod === 'OPTIONS' && e.getResourcePath() === resourcePath)) {
        // We start with the definition of cors of the API
        const cors = JSON.parse(JSON.stringify(apiCors));

        // Try to load a specific config for this resource path
        try {
          const endpointCors = require(path.join(process.cwd(), plugin.lager.getConfig('apiGateway.endpointsPath'), resourcePath, 'cors'));
          // We overwrite the config with the endpoint specific config if it exists
          Object.assign(cors, endpointCors.default || {});
          // We overwrite the config with the endpoint specific config for the API if it exists
          Object.assign(cors, endpointCors[api.getIdentifier()] || {});
        } catch (e) {
          // Ignore if no specific configuration has been found
          // Propagate other errors
          if (e.code !== 'MODULE_NOT_FOUND') { throw e; }
        }

        // Create an OPTION endpoint for the resource path
        const spec = JSON.parse(JSON.stringify(baseSpec));
        const rp = spec['x-amazon-apigateway-integration'].responses.default.responseParameters;
        _.forEach(cors, (value, key) => {
          rp['method.response.header.' + key] = "'" + value + "'";
        });
        const corsEndpoint = new Endpoint(spec, resourcePath, 'OPTIONS');
        addEndpointPromises.push(api.addEndpoint(corsEndpoint, true));

        // @TODO update response headers of allowed methods (including ANY if needed)
      }
    });

    return Promise.all(addEndpointPromises)
    .then(() => {
      return api;
    });

  };

};
