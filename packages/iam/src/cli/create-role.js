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
 * @param {Object} icli
 * @returns {Promise} - a promise that resolve when the operation is done
 */
module.exports = (icli) => {
  // Build the lists of choices
  const choicesLists = getChoices();

  const config = {
    section: 'IAM plugin',
    cmd: 'create-role',
    description: 'create a new role',
    parameters: [{
      cmdSpec: '[identifier]',
      type: 'input',
      validate:  input => { return /^[a-z0-9_-]+$/i.test(input); },
      question: {
        message: 'Choose a unique identifier for the role (alphanumeric caracters, "_" and "-" accepted)'
      }
    }, {
      cmdSpec: '-m, --model <model-identifier>',
      description: 'select a model to quickly create the role configuration',
      type: 'list',
      choices: choicesLists.presetConfigs,
      question: {
        message: 'Choose a model to quickly create the role configuration',
      }
    }, {
      cmdSpec: '-p, --policies <policy-identifiers>',
      description: 'select the policies to attach to the role',
      type: 'checkbox',
      choices: choicesLists.managedPolicies,
      question: {
        message: 'Choose the policies to attach to the role',
        when(answers, cmdParameterValues) {
          if ((answers.model === 'none' || cmdParameterValues.model === 'none') && cmdParameterValues.policies === undefined) {
            return choicesLists.managedPolicies()
            .then(managedPolicies => {
              return managedPolicies.length > 0;
            });
          }
          return false;
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
   * @returns {Object} - collection of lists of choices for "list" and "checkbox" parameters
   */
  function getChoices() {
    const choicesLists = {
      presetConfigs: [{
        value: 'APIGatewayLambdaInvocation',
        name: icli.format.info('APIGatewayLambdaInvocation') + ' - A role that allows API Gateway to invoke AWS Lambda'
      }, {
        value: 'LambdaBasicExecutionRole',
        name: icli.format.info('LambdaBasicExecutionRole') + ' - A role that allows to write in CloudWatch'
      }, {
        value: 'none',
        name: icli.format.info('none') + ' - Do not use a predefined model, you will configure the role yourself'
      }],
      managedPolicies: () => {
        return plugin.loadPolicies()
        .then(policies => {
          // @TODO check if it would be interesting to try to load policies that exist in AWS but not in the myrmex project
          // and add them in choicesLists.managedPolicies
          return _.map(policies, p => {
            return {
              value: p.getName(),
              name: icli.format.info(p.getName()) + ' - defined in this project'
            };
          });
        });
      }
    };
    return choicesLists;
  }

  /**
   * Create the new role
   * @param {Object} parameters - the parameters provided in the command and in the prompt
   * @returns {Promise<null>} - The execution stops here
   */
  function executeCommand(parameters) {
    const configFilePath = path.join(process.cwd(), plugin.config.rolesPath);
    return mkdirpAsync(configFilePath)
    .then(() => {
      if (parameters.model !== 'none') {
        // Case a preset config has been choosen
        const src = path.join(__dirname, 'templates', 'roles', parameters.model + '.json');
        const dest = path.join(configFilePath, parameters.identifier + '.json');
        return ncpAsync(src, dest);
      } else {
        // Case no preset config has been choosen
        const config = {
          'managed-policies': parameters.policies,
          'inline-policies': [],
          'trust-relationship': {
            Version: '2012-10-17',
            Statement: [{
              Effect: 'Allow',
              Principal: { AWS: '*'},
              Action: 'sts:AssumeRole'
            }]
          }
        };
        // We save the specification in a json file
        return fs.writeFileAsync(configFilePath + path.sep + parameters.identifier + '.json', JSON.stringify(config, null, 2));
      }
    })
    .then(() => {
      const msg = '\n  The IAM role ' + icli.format.info(parameters.identifier)
                + ' has been created in ' + icli.format.info(configFilePath + path.sep + parameters.identifier + '.json') + '\n';
      icli.print(msg);
    });
  }

};
