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
  const choicesLists = getChoices();

  const config = {
    section: 'Lambda plugin',
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
      cmdSpec: '-d, --dependencies <dependent-modules>',
      description: 'select the node modules that are dependencies of this new one',
      type: 'checkbox',
      choices: choicesLists.dependencies,
      question: {
        message: 'Choose the node modules that are dependencies of this new one',
        when(answers, cmdParameterValues) {
          if (cmdParameterValues.dependencies) {
            return false;
          }
          return choicesLists.dependencies().then(modules => {
            return modules.length > 0;
          });
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
   * @param {Array} endpoints - the list o available endpoint specifications
   * @returns {Object} - collection of lists of choices for "list" and "checkbox" parameters
   */
  function getChoices() {
    return {
      dependencies: () => {
        return plugin.loadModules()
        .then(modules => {
          return _.map(modules, m => {
            return {
              value: m.getName(),
              name: icli.format.info(m.getName())
            };
          });
        });
      }
    };
  }

  /**
   * Create the new lambda
   * @param {Object} parameters - the parameters provided in the command and in the prompt
   * @returns {Promise<null>} - The execution stops here
   */
  function executeCommand(parameters) {
    const configFilePath = path.join(process.cwd(), plugin.config.modulesPath, parameters.name);
    return mkdirpAsync(configFilePath)
    .then(() => {
      // We create the package.json file
      const packageJson = {
        'name': parameters.name,
        'version': '0.0.0',
        dependencies: {}
      };
      _.forEach(parameters.dependencies, moduleName => {
        packageJson.dependencies[moduleName] = '../' + moduleName;
      });
      // We save the specification in a json file
      return fs.writeFileAsync(configFilePath + path.sep + 'package.json', JSON.stringify(packageJson, null, 2));
    })
    .then(() => {
      const msg = '\n  The node module ' + icli.format.info(parameters.name) + ' has been created\n'
                + '  It is located in ' + icli.format.info(configFilePath) + ' you can start to implement it there.\n'
                + '  To import it in an existing Lambda, edit the file '
                + icli.format.info(path.join(process.cwd(), plugin.config.lambdasPath, '<lambda-identifier>', 'package.json'))
                + ' and add ' + icli.format.info('"' + parameters.name + '": "../modules/' + parameters.name + '"')
                + ' in the section ' + icli.format.info('dependencies') + '\n';
      icli.print(msg);
    });
  }

};
