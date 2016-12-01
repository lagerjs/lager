'use strict';

const Promise = require('bluebird');
const _ = require('lodash');

const path = require('path');
const fs = Promise.promisifyAll(require('fs'));
const mkdirpAsync = Promise.promisify(require('mkdirp'));

const plugin = require('../index');

/**
 * This module exports a function that enrich the interactive command line and return a promise
 * @returns {Promise} - a promise that resolve when the operation is done
 */
module.exports = (icli) => {

  // Build the lists of choices
  return getChoices()
  .then(choicesLists => {

    const config = {
      section: 'Node Lambda plugin',
      cmd: 'create-node-module',
      description: 'create a node module that can be embed in Lambda',
      parameters: [{
        cmdSpec: '[name]',
        type: 'input',
        validate: input => { return /^[a-z0-9_-]+$/i.test(input); },
        question: {
          message: 'Choose a unique name for the module (alphanumeric caracters, "_" and "-" accepted)'
        }
      }, {
        cmdSpec: '-l, --lambdas <lambda>',
        description: 'select the Lambdas that must be configured to embed the module',
        type: 'checkbox',
        choices: choicesLists.lambdas,
        question: {
          message: 'Choose the Lambdas that must be configured to embed the module',
          when(answers, cmdParameterValues) {
            return !cmdParameterValues.lambdas && choicesLists.lambdas && choicesLists.lambdas.length > 0;
          }
        }
      }, {
        cmdSpec: '-d, --dependencies <dependent-modules>',
        description: 'select the node modules that are dependencies of this new one',
        type: 'checkbox',
        choices: choicesLists.dependencies,
        question: {
          message: 'Choose the node modules that are dependencies of this new one',
          when(answers, cmdParameterValues) {
            return !cmdParameterValues.dependencies && choicesLists.dependencies && choicesLists.dependencies.length > 0;
          }
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
   * @param {Array} endpoints - the list o available endpoint specifications
   * @returns {Object} - collection of lists of choices for "list" and "checkbox" parameters
   */
  function getChoices() {
    const choicesLists = {};
    return Promise.all([plugin.loadLambdas(), plugin.loadModules()])
    .spread((lambdas, modules) => {
      choicesLists.lambdas = _.map(lambdas, lambda => {
        return {
          value: lambda.getIdentifier(),
          name: icli.format.info(lambda.getIdentifier())
        };
      });
      choicesLists.dependencies = _.map(modules, p => {
        return {
          value: p.getName(),
          name: icli.format.info(p.getName())
        };
      });
      return choicesLists;
    });
  }

  /**
   * Create the new lambda
   * @param {Object} parameters - the parameters provided in the command and in the prompt
   * @returns {Promise<null>} - The execution stops here
   */
  function executeCommand(parameters) {
    const configFilePath = path.join(process.cwd(), 'node-lambda', 'modules', parameters.name);
    return mkdirpAsync(configFilePath)
    .then(() => {
      // @TODO update configuration of lambdas that embed the node-module
      // We create the package.json file
      const packageJson = {
        'x-lager': {
          dependencies: parameters.dependencies
        }
      };

      // We save the specification in a json file
      return fs.writeFileAsync(configFilePath + path.sep + 'package.json', JSON.stringify(packageJson, null, 2));
    })
    .then(() => {
      const msg = '\n  The node module ' + icli.format.info(parameters.name) + ' has been created\n\n'
                + '  It is located in ' + icli.format.info(configFilePath) + '\n';
      console.log(msg);
    });
  }

};
