'use strict';

const Promise = require('bluebird');
const _ = require('lodash');

const plugin = require('../index');

let deployMode = 'none';

module.exports.setDeployMode = function setDeployMode(mode) {
  deployMode = mode;
};

module.exports.hook = function loadIntegrationsHook(region, context, endpoints, integrationResults) {
  return plugin.loadLambdas()
  .then(lambdas => {
    // If the user does not want to deploy all lambdas, we filter the ones that are related to the endpoints
    if (deployMode !== 'all') {
      const lambdasIdentifiers = [];
      _.forEach(endpoints, endpoint => {
        const spec = endpoint.getSpec();
        if (spec['x-lager'] && spec['x-lager'].lambda) {
          lambdasIdentifiers.push(spec['x-lager'].lambda);
        }
      });
      lambdas = _.filter(lambdas, lambda => {
        return lambdasIdentifiers.indexOf(lambda.getIdentifier()) > -1;
      });
    }

    // Deploy the lambdas if needed
    return Promise.map(lambdas, lambda => {
      if (deployMode !== 'none') {
        return lambda.deploy(region, context)
        .then(report => {
          return lambda;
        });
      }
      return lambda;
    });
  })
  .then(lambdas => {
    return Promise.map(lambdas, lambda => {
      return lambda.getIntegrationDataInjector(region, context);
    });
  })
  .then(integrationDataInjectors => {
    _.forEach(integrationDataInjectors, idi => {
      integrationResults.push(idi);
    });
    return Promise.resolve();
  });
};
