'use strict';

const path = require('path');
const lager = require('@lager/lager/lib/lager');
const Promise = lager.getPromise();
const fs = Promise.promisifyAll(require('fs'));
const _ = lager.getLodash();
const cliTools = require('@lager/lager/lib/cli-tools');
const mkdirpAsync = Promise.promisify(require('mkdirp'));

module.exports = (program, inquirer) => {
  program
  .command('create-policy')
  .description('create a new policy')
  .arguments('[policy-identifier]')
  .action(function action(policyIdentifier, options) {
    // Transform cli arguments and options into a parameter map
    const parameters = cliTools.processCliArgs(arguments);

    // If the cli arguments are correct, we can launch the interactive prompt
    return inquirer.prompt(prepareQuestions(parameters))
    .then(answers => {
      // Merge the parameters from the command and from the prompt and create the new API
      return performTask(_.merge(parameters, answers));
    });
  });

  return Promise.resolve();
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
    name: 'policyIdentifier',
    message: 'Choose a unique identifier for the policy (alphanumeric caracters, "_" and "-" accepted)',
    when: answers => { return !parameters.policyIdentifier; },
    validate: input => { return /^[a-z0-9_-]+$/i.test(input); }
  }];
}

/**
 * Create the new policy
 * @param  {Object} parameters - the parameters provided in the command and in the prompt
 * @return {Promise<null>}
 */
function performTask(parameters) {
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
