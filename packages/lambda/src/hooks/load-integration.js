'use strict';

const Promise = require('bluebird');
const _ = require('lodash');

const plugin = require('../index');
const showReports = require('../tools/show-deployment-reports');

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

    // If the user does not want to deploy lambdas at all, we will just get integration data injectors
    if (deployMode === 'none') {
      return Promise.resolve(lambdas);
    }

    process.stdout.write(lambdas.length + ' Lambda(s) to deploy: ' + _.map(lambdas, l => l.getIdentifier()).join(', ') + '\n\n');

    // Deploy the lambdas
    return Promise.map(lambdas, lambda => lambda.deploy(region, context))
    .then(reports => {
      // Show the result of the deployments on stdout
      showReports(reports);
    })
    .then(() => {
      return lambdas;
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
