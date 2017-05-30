'use strict';

const _ = require('lodash');
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
      cmdSpec: '-r, --region [region]',
      description: 'select the AWS region',
      type: 'list',
      choices: choicesLists.region,
      validationMsgLabel: 'AWS region',
      question: {
        message: 'On which AWS region do you want to test?'
      }
    }, {
      cmdSpec: '-e, --environment [environment]',
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
      cmdSpec: '-a, --alias [alias]',
      description: 'select the alias to test',
      type: 'input',
      default: plugin.myrmex.getConfig('stage') || 'v0',
      question: {
        message: 'Which alias of the Lambda do you want to invoke?',
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
    icli.print();
    icli.print('Executing ' + icli.format.info(parameters.lambdaIdentifier) + ' in AWS');

    return plugin.findLambda(parameters.lambdaIdentifier)
    .then(lambda => {
      if (parameters.environment === undefined) { parameters.environment = plugin.myrmex.getConfig('environment'); }
      if (parameters.stage === undefined) { parameters.stage = plugin.myrmex.getConfig('stage'); }
      const context = { stage: parameters.stage, environment: parameters.environment };
      return lambda.execute(parameters.region, context, parameters.event ? lambda.loadEventExample(parameters.event) : {});
    })
    .then(result => {
      result.Payload = JSON.parse(result.Payload);
      icli.print('Success result:');
      icli.print(JSON.stringify(result, null, 2));
      icli.print();
    })
    .catch(e => {
      icli.print('Error result:');
      icli.print(e);
      icli.print(e.stack);
      icli.print();
    });
  }

};
