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
    section: 'Lager CLI core',
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
        value: '@lager/iam',
        name: icli.format.info('@lager/iam') + ' - manage IAM policies and roles',
        short: 'iam',
        checked: true
      }, {
        value: '@lager/api-gateway',
        name: icli.format.info('@lager/api-gateway') + ' - deploy swagger definitions in API gateway',
        short: 'api-gateway',
        checked: true
      }, {
        value: '@lager/node-lambda',
        name: icli.format.info('@lager/node-lambda') + ' - deploy nodejs Lambda in AWS and associate them to API endpoints',
        short: 'node-lambda',
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
    p.then(() => {
      console.log('\n  Creating Lager config file (' + icli.format.info('lager.json') + ')');
      const projectConfig = {
        name: parameters.projectName || 'A Lager project',
        plugins: parameters.plugins
      };
      return fs.writeFileAsync(configFilePath + path.sep + 'lager.json', JSON.stringify(projectConfig, null, 2));
    })
    .then(() => {
      try {
        require(configFilePath + path.sep + 'package.json');
        // If a package.json file already exist, we don't need to create it
        return Promise.resolve();
      } catch (e) {
        console.log('\n  Creating a node project');
        const cmdArgs = ['init', '-f'];
        console.log('  Running ' + icli.format.cmd('npm ' + cmdArgs.join(' ') + '\n'));
        console.log('  Please wait...');
        return exec('npm ' + cmdArgs.join(' '), { cwd: parameters.projectName })
        .catch(e => {
          console.log(e);
        });
      }
    })
    .then(() => {
      console.log('\n  Installing Lager and Lager plugins');
      const cmdArgs = parameters.plugins;
      cmdArgs.unshift('@lager/lager');
      cmdArgs.unshift('--save');
      cmdArgs.unshift('install');
      console.log('  Running ' + icli.format.cmd('npm ' + cmdArgs.join(' ') + '\n'));
      console.log('  Please wait...');
      return exec('npm ' + cmdArgs.join(' '), { cwd: parameters.projectName });
    })
    .spread((stdOut, stdErr) => {
      console.log(stdOut);
      console.log(stdErr);
      let msg = icli.format.ok('  A new lager project has been created!\n\n');
      if (parameters.projectName) {
        msg += '  You should now enter in the ' + icli.format.info(parameters.projectName) + ' folder to start working\n';
      }
      msg += '  Execute ' + icli.format.cmd('lager -h') + ' in the root folder of the project to see available commands\n';
      msg += '  Execute ' + icli.format.cmd('npm init') + ' to complete the configuration of the project\'s ' + icli.format.info('package.json') + ' file\n';
      console.log(msg);
    });
  }

  /**
   * Create the command and the prompt
   */
  return icli.createSubCommand(config, executeCommand);
};
