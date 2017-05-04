'use strict';

const Promise = require('bluebird');
const _ = require('lodash');

const path = require('path');
const fs = Promise.promisifyAll(require('fs'));
const mkdirpAsync = Promise.promisify(require('mkdirp'));
const ncpAsync = Promise.promisify(require('ncp'));

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
    cmd: 'create-lambda',
    description: 'create a new lambda',
    parameters: [{
      cmdSpec: '[identifier]',
      type: 'input',
      validate: input => { return /^[a-z0-9_-]+$/i.test(input); },
      question: {
        message: 'Choose a unique identifier for the Lambda (alphanumeric caracters, "_" and "-" accepted)'
      }
    }, {
      cmdSpec: '-r, --runtime <nodejs|nodejs4.3|nodejs6.10|python2.7|python3.6>',
      description: 'select the runtime',
      type: 'list',
      choices: choicesLists.runtimes,
      question: {
        message: 'Choose the runtime'
      }
    }, {
      cmdSpec: '-t, --timeout <timeout>',
      description: 'select the timeout (in seconds)',
      type: 'integer',
      question: {
        message: 'Choose the timeout (in seconds)'
      }
    }, {
      cmdSpec: '-m, --memory <memory>',
      description: 'select the memory (in MB)',
      type: 'list',
      choices: choicesLists.memory,
      question: {
        message: 'Choose the memory'
      }
    }, {
      cmdSpec: '-d --dependencies <modules-names>',
      description: 'select the project modules that must be included in the Lambda (only for nodejs runtimes)',
      type: 'checkbox',
      choices: choicesLists.dependencies,
      question: {
        message: 'Choose the node packages that must be included in the Lambda',
        when(answers, cmdParameterValues) {
          const runtime = answers.runtime || cmdParameterValues.runtime;
          if (cmdParameterValues.dependencies || !_.startsWith(runtime, 'nodejs')) { return false; }
          return choicesLists.dependencies().then(dependencies => {
            return dependencies.length > 0;
          });
        }
      }
    }, {
      type: 'list',
      choices: choicesLists.roleOrigins,
      question: {
        name: 'roleOrigin',
        message: 'Where can we find the execution role of the Lambda?',
        when: (answers, cmdParameterValues) => {
          if (cmdParameterValues.role) { return false; }
          return choicesLists.roleOrigins().length > 0;
        }
      }
    }, {
      cmdSpec: '--role <role>',
      description: 'select the execution role' + (plugin.lager.isPluginRegistered('iam') ? '' : ' (enter the ARN)'),
      type: 'list',
      choices: choicesLists.roles,
      // We desactivate validation because the value can be set manually
      validate: input => { return true; },
      question: {
        message: 'Choose the execution role',
        when(answers, cmdParameterValues) {
          if (cmdParameterValues.role) { return false; }
          return answers.roleOrigin === 'lager' || answers.roleOrigin === 'aws';
        }
      }
    }, {
      type: 'input',
      question: {
        name: 'roleManually',
        message: 'Enter the IAM role that will be used to execute the Lambda function' + (plugin.lager.isPluginRegistered('iam') ? '' : ' (enter the ARN)'),
        when(answers, cmdParameterValues) {
          return !answers.role && !cmdParameterValues.role;
        }
      }
    }]
  };

  /**
   * Create the command and the promp
   */
  return icli.createSubCommand(config, executeCommand);

  /**
   * Build the choices for "list" and "checkbox" parameters
   * @param {Array} endpoints - the list o available endpoint specifications
   * @returns {Object} - collection of lists of choices for "list" and "checkbox" parameters
   */
  function getChoices() {
    const memoryValues = [];
    for (let i = 128; i <= 1536; i += 64) {
      memoryValues.push({ value: i.toString(), name: _.padStart(i, 4) + ' MB' });
    }
    return {
      memory: memoryValues,
      runtimes: ['nodejs', 'nodejs4.3', 'nodejs6.10', 'python2.7', 'python3.6'],
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
      },
      roleOrigins: () => {
        if (plugin.lager.isPluginRegistered('iam')) {
          const choices = [];
          choices.push({
            value: 'lager',
            name: 'Select a role managed by the plugin @lager/iam'
          });
          choices.push({
            value: 'aws',
            name: 'Select a role in your AWS account'
          });
          choices.push({
            value: '',
            name: 'Enter the value manually'
          });
          return choices;
        }
        return [];
      },
      roles: (answers) => {
        if (answers && answers.roleOrigin === 'aws') {
          return plugin.lager.call('iam:getAWSRoles', [])
          .then(roles => {
            return _.map(roles, 'RoleName');
          });
        } else {
          return plugin.lager.call('iam:getRoles', [])
          .then(roles => {
            const eligibleRoles = [];
            _.forEach(roles, role => {
              if (_.find(role.config['trust-relationship'].Statement, (o) => { return o.Principal.Service === 'lambda.amazonaws.com'; })) {
                eligibleRoles.push({
                  value: role.getName(),
                  name: icli.format.info(role.getName())
                });
              }
            });
            return eligibleRoles;
          });
        }
      }
    };
  }

  /**
   * Create the new lambda
   * @param {Object} parameters - the parameters provided in the command and in the prompt
   * @returns {Promise<null>} - The execution stops here
   */
  function executeCommand(parameters) {
    if (!parameters.role && parameters.roleManually) { parameters.role = parameters.roleManually; }

    const configFilePath = path.join(process.cwd(), plugin.config.lambdasPath, parameters.identifier);
    return mkdirpAsync(configFilePath)
    .then(() => {
      // We create the configuration file of the Lambda
      const config = {
        params: {
          Timeout: parameters.timeout,
          MemorySize: parameters.memory,
          Role: parameters.role,
          Runtime: parameters.runtime,
          Handler: _.startsWith(parameters.runtime, 'nodejs') ? 'index.handler' : 'lambda_function.lambda_handler'
        }
      };
      // We save the configuration in a json file
      return fs.writeFileAsync(configFilePath + path.sep + 'config.json', JSON.stringify(config, null, 2));
    })
    .then(() => {
      // We create the package.json file
      const packageJson = {
        'name': parameters.identifier,
        'version': '0.0.0',
        dependencies: {}
      };
      _.forEach(parameters.dependencies, moduleName => {
        packageJson.dependencies[moduleName] = path.relative(configFilePath, path.join(process.cwd(), plugin.config.modulesPath, moduleName));
      });
      // We save the package.json file
      return fs.writeFileAsync(configFilePath + path.sep + 'package.json', JSON.stringify(packageJson, null, 2));
    })
    .then(() => {
      // We create the lambda handler
      const src = path.join(__dirname, 'templates', 'index.js');
      const dest = path.join(configFilePath, 'index.js');
      return ncpAsync(src, dest);
    })
    .then(() => {
      // We create a test event file
      const src = path.join(__dirname, 'templates', 'events');
      const dest = path.join(configFilePath, 'events');
      return ncpAsync(src, dest);
    })
    .then(() => {
      const msg = '\n  The Lambda ' + icli.format.info(parameters.identifier) + ' has been created\n\n'
                + '  Its configuration and its handler function are available in ' + icli.format.info(configFilePath) + '\n';
      console.log(msg);
    });
  }

};
