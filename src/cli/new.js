#!/usr/bin/env node
'use strict';

const path = require('path');

// Nice ES6 syntax
// const { Promise, _, icli } = require('@lager/lager/lib/lager').import;
const lager = require('@lager/lager/lib/lager');
const Promise = lager.import.Promise;
const _ = lager.import._;
const icli = lager.import.icli;

const fs = Promise.promisifyAll(require('fs'));

/**
 * This module exports a function that enrich the interactive command line and return a promise
 * @return {Promise} - a promise that resolve when the operation is done
 */
module.exports = () => {
  // Build the lists of choices
  const choicesLists = getChoices();

  const config = {
    cmd: 'new',
    description: 'create a new project',
    parameters: [{
      cmdSpec: '[project-name]',
      type: 'input',
      question: {
        message: 'What is your project name? If you do not provide one, the project will be created in the current directory.'
      }
    }, {
      cmdSpec: '-p, --plugins <plugins-names>',
      description: 'list of plugins to activate for the project',
      type: 'checkbox',
      choices: choicesLists.plugins,
      question: {
        message: 'Which core plugins do you want to use in your project?'
      }
    }]
  };

  /**
   * Create the command and the promp
   */
  return icli.createSubCommand(config, executeCommand);
};


/**
 * Build the choices for "list" and "checkbox" parameters
 * @param  {Array} endpoints - the list o available endpoint specifications
 * @return {Object} - collection of lists of choices for "list" and "checkbox" parameters
 */
function getChoices() {
  return {
    plugins: [{
      value: 'iam',
      name: icli.format.info('iam') + ' - manage IAM policies and roles',
      short: 'iam',
      checked: true
    }, {
      value: 'api-gateway',
      name: icli.format.info('api-gateway') + ' - deploy swagger definitions in API gateway',
      short: 'api-gateway',
      checked: true
    }, {
      value: 'node-lambda',
      name: icli.format.info('node-lambda') + ' - deploy nodejs Lambda in AWS and associate them to API endpoints',
      short: 'node-lambda',
      checked: true
    }]
  };
}

/**
 * Create the new project
 * @param  {Object} parameters - the parameters provided in the command and in the prompt
 * @return {Promise<null>}
 */
function executeCommand(parameters) {
  // If a name has been provided, we create the project directory
  // Otherwise, the project will ne created in the current directory
  const configFilePath = parameters.projectName ? path.join(process.cwd(), parameters.projectName) : process.cwd();
  fs.mkdirAsync(configFilePath)
  .then(() => {
    const projectConfig = {
      name: parameters.projectName || 'A Lager project',
      plugins: parameters.plugins
    };
    return fs.writeFileAsync(configFilePath + path.sep + 'lager.json', JSON.stringify(projectConfig, null, 2));
  })
  .then(() => {
    let msg = '\n  A new lager project has been created!\n\n';
    if (parameters.projectName) {
      msg += '  You should now enter in the ' + icli.format.info(parameters.projectName) + ' folder to start working\n';
    }
    msg += '  Execute the ' + icli.format.cmd('lager -h') + ' command in the root folder of the project to see available commands\n';
    console.log(msg);
  });
}
