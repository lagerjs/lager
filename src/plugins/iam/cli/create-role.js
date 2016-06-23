'use strict';

const path = require('path');

// Nice ES6 syntax
// const { Promise, _, icli } = require('@lager/lager/src/lib/lager').import;
const lager = require('@lager/lager/src/lib/lager');
const Promise = lager.import.Promise;
const icli = lager.import.icli;

const fs = Promise.promisifyAll(require('fs'));
const mkdirpAsync = Promise.promisify(require('mkdirp'));

const plugin = lager.getPlugin('iam');

/**
 * This module exports a function that enrich the interactive command line and return a promise
 * @returns {Promise} - a promise that resolve when the operation is done
 */
module.exports = () => {
  const config = {
    section: 'IAM plugin',
    cmd: 'create-role',
    description: 'create a new role',
    parameters: [{
      cmdSpec: '[role-identifier]',
      type: 'input',
      validate:  input => { return /^[a-z0-9_-]+$/i.test(input); },
      question: {
        message: 'Choose a unique identifier for the role (alphanumeric caracters, "_" and "-" accepted)'
      }
    }]
  };

  /**
   * Create the command and the promp
   */
  return icli.createSubCommand(config, executeCommand);
};

/**
 * Create the new role
 * @param {Object} parameters - the parameters provided in the command and in the prompt
 * @returns {Promise<null>} - The execution stops here
 */
function executeCommand(parameters) {
  const configFilePath = path.join(plugin.getPath(), 'roles');
  return mkdirpAsync(configFilePath)
  .then(() => {
    // We create the configuration file of the Lambda
    const config = {
      'managed-policies': [],
      'inline-policies': [],
      'trust-relationship': {
        Version: '2012-10-17',
        Statement: [{
          Effect: 'Allow',
          Principal: {},
          Action: 'sts:AssumeRole'
        }]
      }
    };

    // We save the specification in a json file
    return fs.writeFileAsync(configFilePath + path.sep + parameters.roleIdentifier + '.json', JSON.stringify(config, null, 2));
  })
  .then(() => {
    console.log('Role created');
  })
  .catch(e => {
    console.log(e);
    console.log(e.stack);
  });
}
