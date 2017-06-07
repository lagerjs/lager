'use strict';

const Promise = require('bluebird');
const _ = require('lodash');

const plugin = require('../index');
const genReportsTable = require('../tools/generate-reports-table');

let deployMode = 'none';
let alias = '';

module.exports.setDeployMode = function setDeployMode(mode) {
  deployMode = mode;
};

module.exports.setAlias = function setAlias(a) {
  alias = a;
};

module.exports.hook = function loadIntegrationsHook(region, context, endpoints, integrationResults) {
  return plugin.loadLambdas()
  .then(lambdas => {
    // Add the Lambda alias to apply to the context
    context.alias = alias;

    // If the user does not want to deploy all lambdas, we filter the ones that are related to the endpoints
    if (deployMode !== 'all') {
      const lambdasIdentifiers = [];
      _.forEach(endpoints, endpoint => {
        const spec = endpoint.getSpec();
        if (spec['x-myrmex'] && spec['x-myrmex'].lambda) {
          lambdasIdentifiers.push(spec['x-myrmex'].lambda);
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

    plugin.myrmex.call('cli:print', lambdas.length + ' Lambda(s) to deploy: ' + _.map(lambdas, l => l.getIdentifier()).join(', ') + '\n\n');

    // Deploy the lambdas
    return Promise.map(lambdas, lambda => lambda.deploy(region, context))
    .then(reports => {
      // Show the result of the deployments in the console
      plugin.myrmex.call('cli:print', genReportsTable(reports));
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
