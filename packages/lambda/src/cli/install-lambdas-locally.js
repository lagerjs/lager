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
    cmd: 'install-lambdas-locally',
    description: 'install lambdas locally',
    parameters: [{
      cmdSpec: '[lambda-identifiers...]',
      type: 'checkbox',
      choices: choicesLists.lambdaIdentifiers,
      question: {
        message: 'Which Lambdas do you want to install locally?'
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
      }
    };
  }

  /**
   * Execute the deployment
   * @param {Object} parameters - the parameters provided in the command and in the prompt
   * @returns {Promise<null>} - The execution stops here
   */
  function executeCommand(parameters) {
    icli.print();
    icli.print('Installing ' + icli.format.info(parameters.lambdaIdentifiers.length) + ' Lambdas:');
    icli.print();
    icli.print('This operation may last a little');

    return plugin.loadLambdas()
    .then(lambdas => {
      // If lambdaIdentifier is empty, we install all lambdas
      if (parameters.lambdaIdentifiers) {
        lambdas = _.filter(lambdas, lambda => { return parameters.lambdaIdentifiers.indexOf(lambda.getIdentifier()) !== -1; });
      }
      return Promise.map(lambdas, (lambda) => {
        return lambda.installLocally();
      });
    })
    .then(() => {
      const lambdaList = parameters.lambdaIdentifiers.map(icli.format.info).join(', ');
      icli.print();
      icli.print('The following Lambdas have been installed: ' + lambdaList);
      icli.print();
    });
  }

};
