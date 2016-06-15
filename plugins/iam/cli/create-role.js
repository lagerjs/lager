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
  .command('create-role')
  .description('create a new role')
  .arguments('[role-identifier]')
  .action(function (roleIdentifier, options) {
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

function prepareQuestions(parameters, valueLists) {
  return [{
    type: 'input',
    name: 'roleIdentifier',
    message: 'Choose a unique identifier for the role (alphanumeric caracters, "_" and "-" accepted)',
    when: answers => { return !parameters.roleIdentifier; },
    validate: input => { return /^[a-z0-9_-]+$/i.test(input); }
  }];
}

/**
 * Create the new endpoint
 * @param  {Object} parameters [description]
 * @return void
 */
function performTask(parameters) {
  const configFilePath = path.join(process.cwd(), 'iam', 'roles');
  return mkdirpAsync(configFilePath)
  .then(() => {
    // We create the configuration file of the Lambda
    const config = {
      'managed-policies': [],
      "inline-policies": [],
      "trust-relationship": {
        "Version": "2012-10-17",
        "Statement": [{
          "Effect": "Allow",
          "Principal": {},
          "Action": "sts:AssumeRole"
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
