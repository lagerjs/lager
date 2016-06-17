'use strict';

const path = require('path');

// Nice ES6 syntax
// const { Promise, _, icli } = require('@lager/lager/lib/lager').import;
const lager = require('@lager/lager/lib/lager');
const Promise = lager.import.Promise;
const icli = lager.import.icli;

const fs = Promise.promisifyAll(require('fs'));
const mkdirpAsync = Promise.promisify(require('mkdirp'));

/**
 * This module exports a function that enrich the interactive command line and return a promise
 * @return {Promise} - a promise that resolve when the operation is done
 */
module.exports = () => {
  const config = {
    cmd: 'create-policy',
    description: 'create a new policy',
    parameters: [{
      cmdSpec: '[policy-identifier]',
      type: 'input',
      validate:  input => { return /^[a-z0-9_-]+$/i.test(input); },
      question: {
        message: 'Choose a unique identifier for the policy (alphanumeric caracters, "_" and "-" accepted)'
      }
    }]
  };

  /**
   * Create the command and the promp
   */
  return icli.createSubCommand(config, executeCommand);
};

/**
 * Create the new policy
 * @param  {Object} parameters - the parameters provided in the command and in the prompt
 * @return {Promise<null>} - The execution stops here
 */
function executeCommand(parameters) {
  const configFilePath = path.join(process.cwd(), 'iam', 'policies');
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
    return fs.writeFileAsync(configFilePath + path.sep + parameters.policyIdentifier + '.json', JSON.stringify(document, null, 2));
  })
  .then(() => {
    console.log('Policy created');
  })
  .catch(e => {
    console.log(e);
    console.log(e.stack);
  });
}
