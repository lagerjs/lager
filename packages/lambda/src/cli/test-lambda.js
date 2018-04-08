'use strict';

const _ = require('lodash');
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
    cmd: 'test-lambda',
    description: 'execute a lambda in AWS',
    parameters: [{
      cmdSpec: '[lambda-identifier]',
      type: 'list',
      choices: choicesLists.lambdaIdentifiers,
      question: {
        message: 'Which Lambda do you want to execute in AWS?'
      }
    }, {
      cmdSpec: '--event <event-name>',
      description: 'Event example to use',
      type: 'list',
      choices: choicesLists.events,
      question: {
        message: 'Which event example do you want to use?',
        when: (answers, cmdParameterValues) => {
          if (cmdParameterValues.event) { return false; }
          return choicesLists.events(answers, cmdParameterValues)
          .then(choices => {
            if (choices.length === 1) {
              cmdParameterValues.event = choices[0];
              return false;
            }
            return choices.length > 0;
          });
        }
      }
    }, {
      cmdSpec: '-r, --region <region>',
      description: 'select the AWS region',
      type: 'list',
      choices: choicesLists.region,
      validationMsgLabel: 'AWS region',
      question: {
        message: 'On which AWS region do you want to test?'
      }
    }, {
      cmdSpec: '-e, --environment <environment>',
      description: 'select the environment',
      type: 'input',
      default: plugin.myrmex.getConfig('environment') || 'DEV',
      question: {
        message: 'On which environment do you want to test?',
        when: (answers, cmdParameterValues) => {
          return cmdParameterValues['environment'] === undefined && plugin.myrmex.getConfig('environment') === undefined;
        }
      }
    }, {
      cmdSpec: '-a, --alias <alias>',
      description: 'select the alias to test',
      type: 'input',
      question: {
        message: 'Which alias of the Lambda do you want to invoke?'
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
      events: (answers, cmdParameterValues) => {
        // @FIXME comquirer is not able to validate a list for a question, using the command parameter values
        if (answers) {
          const lambdaIdentifier = answers.lambdaIdentifier || cmdParameterValues.lambdaIdentifier;
          return plugin.findLambda(lambdaIdentifier)
          .then(lambda => {
            return lambda.getEventExamples();
          });
        }
        // @FIXME so we list all the events of all the lambdas as a workarround
        return plugin.loadLambdas()
        .then(lambdas => {
          return Promise.map(lambdas, lambda => {
            return lambda.getEventExamples();
          });
        })
        .then(eventsLists => {
          return _.uniq(_.concat.apply(null, eventsLists));
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
    icli.print();
    icli.print('Executing ' + icli.format.info(parameters.lambdaIdentifier) + ' in AWS');
    icli.print('  AWS region: ' + icli.format.info(parameters.region));
    icli.print('  Environement (prefix for Lambdas names): ' + icli.format.info(parameters.environment));
    icli.print('  Alias: ' + icli.format.info(parameters.alias || 'no alias'));
    icli.print();

    return plugin.findLambda(parameters.lambdaIdentifier)
    .then(lambda => {
      if (parameters.environment === undefined) { parameters.environment = plugin.myrmex.getConfig('environment'); }
      if (parameters.stage === undefined) { parameters.stage = plugin.myrmex.getConfig('stage'); }
      const context = { stage: parameters.stage, environment: parameters.environment };
      return lambda.execute(parameters.region, context, parameters.event ? lambda.loadEventExample(parameters.event) : {}, parameters.alias);
    })
    .then(result => {
      result.Payload = JSON.parse(result.Payload);
      let message = icli.format.success('Success:');
      if (result.FunctionError === 'Handled') {
        message = icli.format.error('Handled error:');
      } else if (result.FunctionError === 'Unhandled') {
        message = icli.format.error('Unhandled error:');
      }
      icli.print(message);
      icli.print(JSON.stringify(result, null, 2));
      icli.print();
    })
    .catch(e => {
      icli.print(icli.format.error('Execution error:'));
      icli.print(e);
      icli.print(e.stack);
      icli.print();
    });
  }

};
