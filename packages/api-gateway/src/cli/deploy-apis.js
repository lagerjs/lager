'use strict';

const _ = require('lodash');
const Table = require('easy-table');

const plugin = require('../index');

/**
 * This module exports a function that enrich the interactive command line and return a promise
 * @returns {Promise} - a promise that resolve when the operation is done
 */
module.exports = (icli) => {

  // Build the lists of choices
  const choicesLists = getChoices();

  const config = {
    section: 'Api Gateway plugin',
    cmd: 'deploy-apis',
    description: 'deploy apis',
    parameters: [{
      cmdSpec: '[api-identifiers...]',
      type: 'checkbox',
      choices: choicesLists.apiIdentifiers,
      question: {
        message: 'Which APIs do you want to deploy?'
      }
    }, {
      cmdSpec: '-r, --region [region]',
      description: 'select the AWS region',
      type: 'list',
      choices: choicesLists.region,
      validationMsgLabel: 'AWS region',
      question: {
        message: 'On which AWS region do you want to deploy?'
      }
    }, {
      cmdSpec: '-e, --environment [environment]',
      description: 'select the environment',
      type: 'input',
      default: 'DEV',
      question: {
        message: 'On which environment do you want to deploy?',
        when: (answers, cmdParameterValues) => {
          return cmdParameterValues['environment'] === undefined && plugin.lager.getConfig('environment') === undefined;
        }
      }
    }, {
      cmdSpec: '-s, --stage [stage]',
      description: 'select the API stage',
      type: 'input',
      default: 'v0',
      question: {
        message: 'Which API stage do you want to deploy?',
        when: (answers, cmdParameterValues) => {
          return cmdParameterValues['stage'] === undefined && plugin.lager.getConfig('stage') === undefined;
        }
      }
    }],
    execute: executeCommand
  };

  // Allow other plugin to complete the command
  return plugin.lager.fire('createCommand', config)
  .then(() => {
    /**
     * Create the command and the prompt
     */
    return icli.createSubCommand(config);
  });

  /**
   * Build the choices for "list" and "checkbox" parameters
   * @returns {Object} - collection of lists of choices for "list" and "checkbox" parameters
   */
  function getChoices() {
    return {
      apiIdentifiers: () => {
        return plugin.loadApis()
        .then(apis => {
          return _.map(apis, api => {
            return {
              value: api.getIdentifier(),
              name: icli.format.info(api.getIdentifier()) + (api.spec.info && api.spec.info.title ? ' - ' + api.spec.info.title : '')
            };
          });
        });
      },
      region: [
        {
          value: 'us-east-1',
          name: icli.format.info('us-east-1') + '      US East (N. Virginia)',
          short: 'us-east-1 - US East (N. Virginia)'
        }, {
          value: 'us-west-2',
          name: icli.format.info('us-west-2') + '      US West (Oregon)',
          short: 'us-west-2 - US West (Oregon)'
        }, {
          value: 'eu-west-1',
          name: icli.format.info('eu-west-1') + '      EU (Ireland)',
          short: 'eu-west-1 - EU (Ireland)'
        }, {
          value: 'eu-central-1',
          name: icli.format.info('eu-central-1') + '   EU (Frankfurt)',
          short: 'eu-central-1 - EU (Frankfurt)'
        }, {
          value: 'ap-northeast-1',
          name: icli.format.info('ap-northeast-1') + ' Asia Pacific (Tokyo)',
          short: 'ap-northeast-1 - Asia Pacific (Tokyo)'
        }, {
          value: 'ap-southeast-1',
          name: icli.format.info('ap-southeast-1') + ' Asia Pacific (Singapore)',
          short: 'ap-southeast-1 - Asia Pacific (Singapore)'
        }
      ]
    };
  }

  /* istanbul ignore next */
  /**
   * Execute the deployment
   * @param {Object} parameters - the parameters provided in the command and in the prompt
   * @returns {Promise<null>} - The execution stops here
   */
  function executeCommand(parameters) {
    if (parameters.environment === undefined) { parameters.environment = plugin.lager.getConfig('environment'); }
    if (parameters.stage === undefined) { parameters.stage = plugin.lager.getConfig('stage'); }
    const context = {
      environment: parameters.environment,
      stage: parameters.stage
    };

    return plugin.loadApis()
    .then(apis => {
      // Give an overview of what will be deployed
      apis = _.filter(apis, api => { return parameters.apiIdentifiers.indexOf(api.getIdentifier()) !== -1; });
      const endpoints = _.union.apply(null, _.map(apis, api => { return api.getEndpoints(); }));
      const t = new Table();
      _.forEach(endpoints, endpoint => {
        t.cell('Path', endpoint.getResourcePath());
        t.cell('Method', endpoint.getMethod());
        _.forEach(endpoint.getSpec()['x-lager'].apis, apiIdentifier => {
          if (parameters.apiIdentifiers.indexOf(apiIdentifier) > -1) {
            t.cell(apiIdentifier, 'X');
          }
        });
        t.newRow();
      });
      console.log();
      console.log('Endpoints to deploy');
      console.log();
      console.log(t.toString());

      // Load endpoints integrations
      return Promise.all([
        apis,
        plugin.loadIntegrations(parameters.region, context, endpoints)
      ]);
    })
    .spread((apis, integrations) => {
      // @TODO show information about the integration load

      // Deploy in API Gateway
      // To avoid TooManyRequestsException, we delay the deployment of each api
      const promises = [];
      let delay = 0;
      _.forEach(apis, api => {
        promises.push(new Promise((resolve, reject) => {
          // 30 seconds delay
          setTimeout(() => {
            console.log('Deploying ' + api.getIdentifier() + ' ...');
            resolve(api.deploy(parameters.region, context));
          }, delay * 30000);
        }));
        delay++;
      });
      return Promise.all([
        apis,
        Promise.all(promises)
      ]);
    })
    .spread((apis, results) => {
      // Display deployment result
      const t = new Table();
      _.forEach(results, result => {
        t.cell('Identifier', result.api.getIdentifier());
        t.cell('Name', result.report.name);
        t.cell('Operation', result.report.operation);
        t.cell('Stage', result.report.stage);
        t.cell('AWS identifier', result.report.awsId);
        if (result.report.failed) {
          t.cell('Url', result.report.failed);
        } else {
          t.cell('Url', 'https://' + result.report.awsId + '.execute-api.us-east-1.amazonaws.com/' + result.report.stage);
        }
        t.newRow();
      });
      console.log();
      console.log('APIs deployed');
      console.log();
      console.log(t.toString());

      // Publish the APIs
      return Promise.map(apis, api => { return api.publish(parameters.region, context); });
    })
    .then(() => {
      console.log('APIs published');
    });
  }

};
