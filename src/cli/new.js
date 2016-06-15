#!/usr/bin/env node
'use strict';

const path = require('path');
const lager = require('@lager/lager/lib/lager');
const Promise = lager.getPromise();
const fs = Promise.promisifyAll(require('fs'));
const _ = lager.getLodash();
const cliTools = require('@lager/lager/lib/cli-tools');

module.exports = function(program, inquirer) {
  const choicesLists = {
    plugins: [{
      value: 'iam',
      name: cliTools.format.info('iam') + ' - manage IAM policies and roles',
      short: 'iam',
      checked: true
    }, {
      value: 'api-gateway',
      name: cliTools.format.info('api-gateway') + ' - deploy swagger definitions in API gateway',
      short: 'api-gateway',
      checked: true
    }, {
      value: 'node-lambda',
      name: cliTools.format.info('node-lambda') + ' - deploy nodejs Lambda in AWS and associate them to API endpoints',
      short: 'node-lambda',
      checked: true
    }]
  };

  program
  .command('new')
  .description('create a new project')
  .arguments('[project-name]')
  .option('-p, --plugins <plugins-names>', 'list of plugins to activate for the project', cliTools.listParser)
  .action(function(apiIdentifier, options) {
    // Transform cli arguments and options into a parameter map
    let parameters = cliTools.processCliArgs(arguments, []);

    // If the cli arguments are correct, we can launch the interactive prompt
    return inquirer.prompt(prepareQuestions(parameters, choicesLists))
    .then(answers => {
      // Merge the parameters from the command and from the prompt and create the new API
      return performTask(_.merge(parameters, answers));
    });
  });
};

/**
 * Prepare the list of questions for the prompt
 * @param  {Object} parameters - the parameters that have already been passed to the cli
 * @param  {Object} choicesLists - lists of values for closed choice parameters
 * @return {Array}
 */
function prepareQuestions(parameters, choicesLists) {
  return [{
    type: 'input',
    name: 'projectName',
    message: 'What is your project name? If you do not provide one, the project will be created in the current directory.',
    when: answers => { return !parameters.projectName; }
  }, {
    type: 'checkbox',
    name: 'plugins',
    message: 'Which core plugins do you want to use in your project?',
    choices: choicesLists.plugins,
    when: answers => { return !parameters.plugins; }
  }];
}

/**
 * Create the new endpoint
 * @param  {Object} parameters [description]
 * @return void
 */
function performTask(parameters) {
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
      msg += '  You should now enter in the ' + cliTools.format.info(parameters.projectName) + ' folder to start working\n';
    }
    msg += '  Execute the ' + cliTools.format.cmd('lager') + ' command in the root folder of the project to see available commands\n';
    console.log(msg);
  });
}
