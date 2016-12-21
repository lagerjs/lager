'use strict';

const _ = require('lodash');
const plugin = require('../index');

/**
 * This module exports a function that enrich the interactive command line and return a promise
 * @returns {Promise} - a promise that resolve when the operation is done
 */
module.exports = (icli) => {

  // Build the list of available APIs andAWS regions for input verification and interactive selection
  return getChoices()
  .then(choicesLists => {
    const config = {
      section: 'Node Lambda plugin',
      cmd: 'install-node-lambdas-locally',
      description: 'install lambdas locally (copy and install dependencies)',
      parameters: [{
        cmdSpec: '[lambda-identifiers...]',
        type: 'checkbox',
        choices: choicesLists.lambdaIdentifiers,
        question: {
          message: 'Which Lambdas do you want to install locally?'
        }
      }]
    };

    /**
     * Create the command and the promp
     */
    return icli.createSubCommand(config, executeCommand);
  });

  /**
   * Build the choices for "list" and "checkbox" parameters
   * @returns {Object} - collection of lists of choices for "list" and "checkbox" parameters
   */
  function getChoices() {
    // First, retrieve possible values for the api-identifiers parameter
    return plugin.loadLambdas()
    .then(lambdas => {
      return {
        lambdaIdentifiers: _.map(lambdas, lambda => {
          return {
            value: lambda.getIdentifier(),
            name: icli.format.info(lambda.getIdentifier())
          };
        })
      };
    });
  }

  /**
   * Execute the deployment
   * @param {Object} parameters - the parameters provided in the command and in the prompt
   * @returns {Promise<null>} - The execution stops here
   */
  function executeCommand(parameters) {
    console.log();
    console.log('Installing ' + icli.format.info(parameters.lambdaIdentifiers.length) + ' Lambdas:');
    console.log();
    console.log('This operation may last a little');

    return plugin.installLocally(parameters.lambdaIdentifiers)
    .then(() => {
      const lambdaList = parameters.lambdaIdentifiers.map(icli.format.info).join(', ');
      console.log();
      console.log('The following Lambdas have been installed: ' + lambdaList);
      console.log();
    });
  }

};
