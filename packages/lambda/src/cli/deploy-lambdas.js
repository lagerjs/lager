'use strict';

const _ = require('lodash');
const genReportsTable = require('../tools/generate-reports-table');
const plugin = require('../index');
const regions = require('./regions');

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
        message: 'Which Lambdas do you want to deploy?',
        when: (answers, cmdParameterValues) => {
          return cmdParameterValues.lambdaIdentifiers.length === 0 && !cmdParameterValues.all;
        }
      }
    }, {
      cmdSpec: '--all',
      description: 'deploy all lambdas of the project',
      type: 'boolean',
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
      cmdSpec: '-a, --alias <alias>',
      description: 'select the alias to apply',
      type: 'input',
      question: {
        message: 'Which alias do you want to apply?',
        when: (answers, cmdParameterValues) => {
          return cmdParameterValues['alias'] === undefined && plugin.myrmex.getConfig('lambda.alias') === undefined;
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
      region: regions(icli)
    };
  }

  /**
   * Execute the deployment
   * @param {Object} parameters - the parameters provided in the command and in the prompt
   * @returns {Promise<null>} - The execution stops here
   */
  function executeCommand(parameters) {
    if (parameters.environment === undefined) { parameters.environment = plugin.myrmex.getConfig('environment'); }
    if (parameters.alias === undefined) { parameters.alias = plugin.myrmex.getConfig('lambda.alias'); }

    return plugin.loadLambdas()
    .then(lambdas => {
      // If the parameter "all" is set, we deploy all lambdas
      if (!parameters.all) {
        lambdas = _.filter(lambdas, lambda => { return parameters.lambdaIdentifiers.indexOf(lambda.getIdentifier()) !== -1; });
      }

      icli.print();
      icli.print('Deploying ' + icli.format.info(lambdas.length) + ' Lambda(s):');
      icli.print('  AWS region: ' + icli.format.info(parameters.region));
      icli.print('  Environement (prefix for Lambdas names): ' + icli.format.info(parameters.environment || 'no environment prefix'));
      icli.print('  Alias: ' + icli.format.info(parameters.alias || 'no alias'));
      icli.print();
      icli.print('This operation may last a little');

      return Promise.map(lambdas, lambda => {
        const context = {
          alias: parameters.alias,
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
