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
      cmdSpec: '-r, --region <region>',
      description: 'select the AWS region',
      type: 'list',
      choices: choicesLists.region,
      validationMsgLabel: 'AWS region',
      question: {
        message: 'On which AWS region do you want to deploy?'
      }
    }, {
      cmdSpec: '-e, --environment <environment>',
      description: 'select the environment',
      type: 'input',
      default: 'DEV',
      question: {
        message: 'On which environment do you want to deploy?',
        when: (answers, cmdParameterValues) => {
          return cmdParameterValues['environment'] === undefined && plugin.myrmex.getConfig('environment') === undefined;
        }
      }
    }, {
      cmdSpec: '-s, --stage <stage>',
      description: 'select the API stage',
      type: 'input',
      default: 'v0',
      question: {
        message: 'Which API stage do you want to deploy?',
        when: (answers, cmdParameterValues) => {
          return cmdParameterValues['stage'] === undefined && plugin.myrmex.getConfig('stage') === undefined;
        }
      }
    }],
    execute: executeCommand
  };

  /**
   * Create the command and the prompt
   */
  return icli.createSubCommand(config);

  /**
   * Build the choices for "list" and "checkbox" parameters
   * @returns {Object} - collection of lists of choices for "list" and "checkbox" parameters
   */
  function getChoices() {
    return {
      apiIdentifiers: () => {
        return plugin.loadApis()
        .then(apis => {
          if (!apis.length) {
            icli.print(icli.format.error('This project does not contain any API.'));
            process.exit(1);
          }
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
          value: 'us-east-2',
          name: icli.format.info('us-east-2') + '      US East (Ohio)',
          short: 'us-east-2 - US East (Ohio)'
        }, {
          value: 'us-west-1',
          name: icli.format.info('us-west-1') + '      US West (N. California)',
          short: 'us-west-1 - US West (N. California)'
        }, {
          value: 'us-west-2',
          name: icli.format.info('us-west-2') + '      US West (Oregon)',
          short: 'us-west-2 - US West (Oregon)'
        }, {
          value: 'ca-central-1',
          name: icli.format.info('ca-central-1') + '   Canada (Central)',
          short: 'ca-central-1 - Canada (Central)'
        }, {
          value: 'sa-east-1',
          name: icli.format.info('sa-east-1') + '      South America (São Paulo)',
          short: 'sa-east-1 - South America (São Paulo)'
        }, {
          value: 'eu-west-1',
          name: icli.format.info('eu-west-1') + '      EU (Ireland)',
          short: 'eu-west-1 - EU (Ireland)'
        }, {
          value: 'eu-west-2',
          name: icli.format.info('eu-west-2') + '      EU (London)',
          short: 'eu-west-2 - EU (London)'
        }, {
          value: 'eu-west-3',
          name: icli.format.info('eu-west-3') + '      EU (Paris)',
          short: 'eu-west-3 - EU (Paris)'
        }, {
          value: 'eu-central-1',
          name: icli.format.info('eu-central-1') + '   EU (Frankfurt)',
          short: 'eu-central-1 - EU (Frankfurt)'
        }, {
          value: 'ap-south-1',
          name: icli.format.info('ap-south-1') + '     Asia Pacific (Mumbai)',
          short: 'ap-south-1 - Asia Pacific (Mumbai)'
        }, {
          value: 'ap-northeast-1',
          name: icli.format.info('ap-northeast-1') + ' Asia Pacific (Tokyo)',
          short: 'ap-northeast-1 - Asia Pacific (Tokyo)'
        }, {
          value: 'ap-northeast-2',
          name: icli.format.info('ap-northeast-2') + ' Asia Pacific (Seoul)',
          short: 'ap-northeast-2 - Asia Pacific (Seoul)'
        }, {
          value: 'ap-northeast-3',
          name: icli.format.info('ap-northeast-3') + ' Asia Pacific (Osaka-Local)',
          short: 'ap-northeast-3 - Asia Pacific (Osaka-Local)'
        }, {
          value: 'ap-southeast-1',
          name: icli.format.info('ap-southeast-1') + ' Asia Pacific (Singapore)',
          short: 'ap-southeast-1 - Asia Pacific (Singapore)'
        }, {
          value: 'ap-southeast-2',
          name: icli.format.info('ap-southeast-2') + ' Asia Pacific (Sydney)',
          short: 'ap-southeast-2 - Asia Pacific (Sydney)'
        }
      ]
    };
  }

  /**
   * Execute the deployment
   * @param {Object} parameters - the parameters provided in the command and in the prompt
   * @returns {Promise<null>} - The execution stops here
   */
  function executeCommand(parameters) {
    if (parameters.environment === undefined) { parameters.environment = plugin.myrmex.getConfig('environment'); }
    if (parameters.stage === undefined) { parameters.stage = plugin.myrmex.getConfig('stage'); }
    const context = {
      environment: parameters.environment,
      stage: parameters.stage
    };

    return plugin.loadApis()
    .then(apis => {
      // Give an overview of what will be deployed
      apis = _.filter(apis, api => { return parameters.apiIdentifiers.indexOf(api.getIdentifier()) !== -1; });
      const endpoints = _.concat.apply(null, _.map(apis, api => { return api.getEndpoints(); }));
      const filteredEndpoints = _.reduce(endpoints, (result, endpoint) => {
        let r = _.find(result, (o) => { return o.path === endpoint.getResourcePath() && o.method === endpoint.getMethod() });
        if (!r) {
          r = {
            path: endpoint.getResourcePath(),
            method: endpoint.getMethod(),
            apis: []
          }
          result.push(r);
        }
        r.apis = _.union(r.apis, endpoint.getSpec()['x-myrmex'].apis);
        return result;
      }, []);
      const sortedEndpoints = _.sortBy(filteredEndpoints, ['path', 'method']);
      const t = new Table();
      _.forEach(sortedEndpoints, endpoint => {
        t.cell('Path', endpoint.path);
        t.cell('Method', endpoint.method);
        _.forEach(endpoint.apis, apiIdentifier => {
          if (parameters.apiIdentifiers.indexOf(apiIdentifier) > -1) {
            t.cell(apiIdentifier, 'X');
          }
        });
        t.newRow();
      });
      icli.print();
      icli.print('Endpoints to deploy');
      icli.print();
      icli.print(t.toString());

      // Load endpoints integrations
      return Promise.all([
        apis,
        plugin.loadIntegrations(parameters.region, context, endpoints)
      ]);
    })
    .spread((apis, integrations) => {
      // Deploy in API Gateway
      // To avoid TooManyRequestsException, we delay the deployment of each API
      const promises = [];
      let delay = 0;
      _.forEach(apis, api => {
        promises.push(new Promise((resolve, reject) => {
          // 35 seconds delay
          setTimeout(() => {
            icli.print('Deploying ' + icli.format.info(api.getIdentifier()) + ' ...');
            resolve(api.deploy(parameters.region, context));
          }, delay * 35000);
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
      let success = true;
      const t = new Table();
      _.forEach(results, result => {
        t.cell('Identifier', result.api.getIdentifier());
        t.cell('Name', result.report.name);
        t.cell('Operation', result.report.operation);
        t.cell('Stage', result.report.stage);
        t.cell('AWS identifier', result.report.awsId);
        if (result.report.failed) {
          t.cell('Url', icli.format.error(result.report.failed));
          success = false;
        } else {
          t.cell(
            'Url',
            icli.format.info('https://' + result.report.awsId + '.execute-api.' + result.report.region + '.amazonaws.com/' + result.report.stage)
          );
        }
        t.newRow();
      });
      icli.print();
      icli.print(icli.format.success('Deployment done'));
      icli.print();
      icli.print(t.toString());

      // Publish the APIs
      if (success) {
        return Promise.map(apis, api => { return api.publish(parameters.region, context); })
        .then(() => {
          icli.print(icli.format.success('APIs have been published'));
          icli.print();
        })
        .catch(e => {
          icli.print(icli.format.error('The deployment of APIs succeed but the publication step failed.'));
          icli.print(e);
          process.exit(1);
        });
      } else {
        icli.print(icli.format.error('The deployment of one or more APIs failed. The publication step will not be performed.'));
        icli.print();
        process.exit(1);
      }
    });
  }

};
