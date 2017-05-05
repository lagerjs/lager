'use strict';

const _ = require('lodash');
const genReportsTable = require('../tools/generate-reports-table');
const plugin = require('../index');

/**
 * This module exports a function that enrich the interactive command line and return a promise
 * @returns {Promise} - a promise that resolve when the operation is done
 */
module.exports = (icli) => {

  // Build the lists of choices
  const choicesLists = getChoices();

  const config = {
    section: 'Lambda plugin',
    cmd: 'deploy-lambdas',
    description: 'deploy lambdas',
    parameters: [{
      cmdSpec: '[lambda-identifiers...]',
      type: 'checkbox',
      choices: choicesLists.lambdaIdentifiers,
      question: {
        message: 'Which Lambdas do you want to deploy?'
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
      description: 'select the stage (aka Lambda alias) to apply',
      type: 'input',
      default: 'v0',
      question: {
        message: 'Which stage (aka Lambda alias) do you want to apply?',
        when: (answers, cmdParameterValues) => {
          return cmdParameterValues['stage'] === undefined && plugin.lager.getConfig('stage') === undefined;
        }
      }
    }]
  };

  /**
   * Create the command and the promp
   */
  return icli.createSubCommand(config, executeCommand);


  /**
   * Build the choices for "list" and "checkbox" parameters
   * @returns {Object} - collection of lists of choices for "list" and "checkbox" parameters
   */
  function getChoices() {
    // First, retrieve possible values for the api-identifiers parameter
    return {
      lambdaIdentifiers: () => {
        return plugin.loadLambdas()
        .then(lambdas => {
          if (!lambdas.length) {
            icli.print(icli.format.error('This project does not contain any Lambda.'));
            process.exit(1);
          }
          return _.map(lambdas, lambda => {
            return {
              value: lambda.getIdentifier(),
              name: icli.format.info(lambda.getIdentifier())
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
    if (parameters.environment === undefined) { parameters.environment = plugin.lager.getConfig('environment'); }
    if (parameters.stage === undefined) { parameters.stage = plugin.lager.getConfig('stage'); }

    icli.print();
    icli.print('Deploying ' + icli.format.info(parameters.lambdaIdentifiers.length) + ' Lambda(s):');
    icli.print('  AWS region: ' + icli.format.info(parameters.region));
    icli.print('  Lager environement (prefix for Lambdas names): ' + icli.format.info(parameters.environment));
    icli.print('  Lager stage (used as Lambda alias): ' + icli.format.info(parameters.stage));
    icli.print();
    icli.print('This operation may last a little');

    return plugin.loadLambdas()
    .then(lambdas => {
      // If lambdaIdentifier is empty, we deploy all lambdas
      if (parameters.lambdaIdentifiers) {
        lambdas = _.filter(lambdas, lambda => { return parameters.lambdaIdentifiers.indexOf(lambda.getIdentifier()) !== -1; });
      }
      return Promise.map(lambdas, lambda => {
        const context = {
          stage: parameters.stage,
          environment: parameters.environment
        };
        return lambda.deploy(parameters.region, context);
      });
    })
    .then(reports => {
      icli.print(genReportsTable(reports));
    })
    .catch(e => {
      if (e.code === 'AccessDeniedException' && e.cause && e.cause.message) {
        icli.print('\n    ' + icli.format.error('Insufficient permissions to perform the action\n'));
        icli.print('The IAM user/role you are using to perform this action does not have sufficient permissions.\n');
        icli.print(e.cause.message + '\n');
        icli.print('Please update the policies of the user/role before trying again.\n');
        process.exit(1);
      }
      throw e;
    });
  }

};
