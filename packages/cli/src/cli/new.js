'use strict';

const path = require('path');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const exec = Promise.promisify(require('child_process').exec, { multiArgs: true });

/**
 * This module exports a function that enrich the interactive command line and return a promise
 * @returns {Promise} - a promise that resolve when the operation is done
 */
module.exports = (icli) => {
  // Build the lists of choices
  const choicesLists = getChoices();

  const config = {
    section: 'CLI core',
    cmd: 'new',
    description: 'create a new project',
    parameters: [{
      cmdSpec: '[project-name]',
      type: 'input',
      question: {
        message: 'What is your project name? If you do not provide one, the project will be created in the current directory.'
      }
    }, {
      cmdSpec: '[plugins...]',
      description: 'list of plugins to activate for the project',
      type: 'checkbox',
      choices: choicesLists.plugins,
      question: {
        message: 'Which core plugins do you want to use in your project?'
      }
    }]
  };

  /**
   * Build the choices for "list" and "checkbox" parameters
   * @param {Array} endpoints - the list o available endpoint specifications
   * @returns {Object} - collection of lists of choices for "list" and "checkbox" parameters
   */
  function getChoices() {
    return {
      plugins: [{
        value: '@myrmex/iam',
        name: icli.format.info('@myrmex/iam') + ' - manage IAM policies and roles',
        short: 'iam',
        checked: true
      }, {
        value: '@myrmex/api-gateway',
        name: icli.format.info('@myrmex/api-gateway') + ' - deploy swagger definitions in API gateway',
        short: 'api-gateway',
        checked: true
      }, {
        value: '@myrmex/lambda',
        name: icli.format.info('@myrmex/lambda') + ' - deploy Lambda in AWS and associate them to API endpoints',
        short: 'lambda',
        checked: true
      }]
    };
  }

  /**
   * Create the new project
   * @param {Object} parameters - the parameters provided in the command and in the prompt
   * @returns {Promise<null>} - The execution stops here
   */
  function executeCommand(parameters) {
    // If a name has been provided, we create the project directory
    // Otherwise, the project will ne created in the current directory
    let configFilePath = process.cwd();
    let p = Promise.resolve();
    if (parameters.projectName) {
      configFilePath += path.sep + parameters.projectName;
      p = fs.mkdirAsync(configFilePath)
      .catch(e => {
        // Fail silently if the directory already exists
      });
    }
    return p.then(() => {
      icli.print('\n  Creating Myrmex config file (' + icli.format.info('myrmex.json') + ')');
      const projectConfig = {
        name: parameters.projectName || 'A Myrmex project',
        plugins: parameters.plugins
      };
      return fs.writeFileAsync(configFilePath + path.sep + 'myrmex.json', JSON.stringify(projectConfig, null, 2));
    })
    .then(() => {
      try {
        require(configFilePath + path.sep + 'package.json');
        // If a package.json file already exist, we don't need to create it
        return Promise.resolve();
      } catch (e) {
        icli.print('\n  Creating a node project');
        const cmdArgs = ['init', '-f'];
        icli.print('  Running ' + icli.format.cmd('npm ' + cmdArgs.join(' ') + '\n'));
        icli.print('  Please wait...');
        return exec('npm ' + cmdArgs.join(' '), { cwd: parameters.projectName })
        .catch(e => {
          icli.print(e);
        });
      }
    })
    .then(() => {
      icli.print('\n  Installing Myrmex and Myrmex plugins');
      const cmdArgs = parameters.plugins;
      cmdArgs.unshift('@myrmex/core');
      cmdArgs.unshift('--save-dev');
      cmdArgs.unshift('install');
      icli.print('  Running ' + icli.format.cmd('npm ' + cmdArgs.join(' ') + '\n'));
      icli.print('  Please wait...');
      return exec('npm ' + cmdArgs.join(' '), { cwd: parameters.projectName });
    })
    .spread((stdOut, stdErr) => {
      icli.print(stdOut);
      icli.print(stdErr);
      let msg = icli.format.ok('  A new myrmex project has been created!\n\n');
      if (parameters.projectName) {
        msg += '  You should now enter in the ' + icli.format.info(parameters.projectName) + ' folder to start working\n';
      }
      msg += '  Execute ' + icli.format.cmd('myrmex -h') + ' in the root folder of the project to see available commands\n';
      icli.print(msg);
      return true;
    });
  }

  /**
   * Create the command and the prompt
   */
  return icli.createSubCommand(config, executeCommand);
};
