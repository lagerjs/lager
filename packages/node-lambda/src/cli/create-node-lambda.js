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
    section: 'Node Lambda plugin',
    cmd: 'create-node-lambda',
    description: 'create a new lambda',
    parameters: [{
      cmdSpec: '[identifier]',
      type: 'input',
      validate: input => { return /^[a-z0-9_-]+$/i.test(input); },
      question: {
        message: 'Choose a unique identifier for the Lambda (alphanumeric caracters, "_" and "-" accepted)'
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
      cmdSpec: '--modules <modules>',
      description: 'select the modules that must be included in the Lambda',
      type: 'checkbox',
      choices: choicesLists.modules,
      question: {
        message: 'Choose the node packages that must be included in the Lambda',
        when(answers, cmdParameterValues) {
          if (cmdParameterValues.modules) { return false; }
          return choicesLists.modules().then(modules => {
            return modules.length > 0;
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
      cmdSpec: '-r, --role <role>',
      description: 'select the execution role' + (plugin.lager.isPluginRegistered('iam') ? '' : ' (enter the ARN)'),
      type: 'list',
      choices: choicesLists.roles,
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
    }, {
      cmdSpec: '--template <template>',
      description: 'select a template to initialise the Lambda function (aka handler)',
      type: 'list',
      choices: choicesLists.template,
      default: choicesLists.template[0],
      question: {
        message: 'Select an template to initialise the Lambda function (aka handler)'
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
      template: [{
        value: 'none',
        name: icli.format.info('none') + ' - Do not add an specific template to the Lambda, you will write a custom one (recommended)'
      }, {
        value: 'api-endpoints',
        name: icli.format.info('api-endpoints') + ' - Opinionated definition of "action" modules in endpoints managed by the api-gateway plugin'
      }],
      modules: () => {
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
          return [{
            value: 'lager',
            name: 'Select a role managed by the plugin @lager/iam'
          }, {
            value: 'aws',
            name: 'Select a role in your AWS account'
          }, {
            value: '',
            name: 'Enter the value manually'
          }];
        }
        return [];
      },
      roles: (answers) => {
        if (answers.roleOrigin === 'aws') {
          return plugin.lager.call('iam:getAWSRoles', [])
          .then(roles => {
            return _.map(roles, 'RoleName');
          });
        } else {
          return plugin.lager.call('iam:getRoles', [])
          .then(roles => {
            return _.map(roles, r => {
              return {
                value: r.getName(),
                name: icli.format.info(r.getName()) + ' - ' + (r.getDescription() || 'No description')
              };
            });
          });
        }
      }
    };
  }

  /* istanbul ignore next */
  /**
   * Create the new lambda
   * @param {Object} parameters - the parameters provided in the command and in the prompt
   * @returns {Promise<null>} - The execution stops here
   */
  function executeCommand(parameters) {
    if (!parameters.role && parameters.roleManually) {
      parameters.role = parameters.roleManually;
    }
    const configFilePath = path.join(process.cwd(), plugin.config.lambdasPath, parameters.identifier);
    return mkdirpAsync(configFilePath)
    .then(() => {
      // We create the configuration file of the Lambda
      const config = {
        params: {
          Timeout: parameters.timeout,
          MemorySize: parameters.memory,
          Role: parameters.role
        },
        includeEndpoints: parameters.template === 'api-endpoints',
      };
      // We save the configuration in a json file
      return fs.writeFileAsync(configFilePath + path.sep + 'config.json', JSON.stringify(config, null, 2));
    })
    .then(() => {
      // We create the package.json file
      const packageJson = {
        'x-lager': {
          dependencies: parameters.modules || []
        }
      };
      // We save the specification in a json file
      return fs.writeFileAsync(configFilePath + path.sep + 'package.json', JSON.stringify(packageJson, null, 2));
    })
    .then(() => {
      // We create the lambda handler
      const src = path.join(__dirname, 'templates', 'index.js');
      const dest = path.join(configFilePath, 'index.js');
      return ncpAsync(src, dest);
    })
    .then(() => {
      // We create the file executed by the handler
      const src = path.join(__dirname, 'templates', 'exec-files', parameters.template + '.js');
      const dest = path.join(configFilePath, 'exec.js');
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
