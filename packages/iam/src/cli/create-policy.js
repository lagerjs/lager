'use strict';

const Promise = require('bluebird');

const path = require('path');
const fs = Promise.promisifyAll(require('fs'));
const mkdirpAsync = Promise.promisify(require('mkdirp'));

const plugin = require('../index');

/**
 * This module exports a function that enrich the interactive command line and return a promise
 * @returns {Promise} - a promise that resolve when the operation is done
 */
module.exports = (icli) => {
  const config = {
    section: 'IAM plugin',
    cmd: 'create-policy',
    description: 'create a new policy',
    parameters: [{
      cmdSpec: '[identifier]',
      type: 'input',
      validate:  input => { return /^[a-z0-9_-]+$/i.test(input); },
      question: {
        message: 'Choose a unique identifier for the policy (alphanumeric caracters, "_" and "-" accepted)'
      }
    }],
    execute: executeCommand
  };

  /**
   * Create the command and the prompt
   */
  return icli.createSubCommand(config);

  /**
   * Create the new policy
   * @param {Object} parameters - the parameters provided in the command and in the prompt
   * @returns {Promise<null>} - The execution stops here
   */
  function executeCommand(parameters) {
    const configFilePath = path.join(process.cwd(), plugin.config.policiesPath);
    return mkdirpAsync(configFilePath)
    .then(() => {
      // We create the configuration file of the Lambda
      const document = {
        Version: '2012-10-17',
        Statement: [{
          Effect: 'Deny',
          Action: ['*'],
          Resource: ['*']
        }]
      };

      // We save the specification in a json file
      return fs.writeFileAsync(configFilePath + path.sep + parameters.identifier + '.json', JSON.stringify(document, null, 2));
    })
    .then(() => {
      const msg = '\n  The IAM policy ' + icli.format.info(parameters.identifier)
                + ' has been created in ' + icli.format.info(configFilePath + path.sep + parameters.identifier + '.json') + '\n\n';
      icli.print(msg);
    });
  }

};
