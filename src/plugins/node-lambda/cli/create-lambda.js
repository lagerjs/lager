'use strict';

const path = require('path');
const lager = require('@lager/lager/lib/lager');
const Promise = lager.getPromise();
const fs = Promise.promisifyAll(require('fs'));
const _ = lager.getLodash();
const cliTools = require('@lager/lager/lib/cli-tools');
const ncpAsync = Promise.promisify(require('ncp'));
const mkdirpAsync = Promise.promisify(require('mkdirp'));

module.exports = function createLambdaCmd(program, inquirer) {

  // Build the list of available APIs for input verification and interactive selection
  const memoryValues = [];
  for (let i = 128; i <= 1536; i += 64) {
    memoryValues.push({ value: i, label: i + 'MB' });
  }
  const choicesLists = {
    memory: memoryValues,
    execType: [{
      value: 'api-endpoints',
      name: cliTools.format.info('api-endpoints') + ' - With this type of execution, the Lambda will execute endpoints defined by the api-gateway plugin'
    }, {
      value: 'none',
      name: cliTools.format.info('none') + ' - Do not add an execution type to the Lambda, you will write a custom one'
    }]
  };
  const validators = {
    memory: cliTools.generateListValidator(choicesLists.memory, 'memory value'),
    execType: cliTools.generateListValidator(choicesLists.execType, 'Lambda execution type')
  };

  program
  .command('create-lambda')
  .description('create a new lambda')
  .arguments('[lambda-identifier]')
  .option('-t, --timeout <timeout>', 'Select the timeout (seconds)', parseInt)
  .option('-m, --memory <memory>', 'Select the memory (MB)', parseInt)
  .option('-r, --role <role>', 'Select the execution role')
  .option('-e, --exec-type <execution-type>', 'Select the type of execution to associate to the lambda')
  .action(function action(lambdaIdentifier, options) {
    // Transform cli arguments and options into a parameter map
    const parameters = cliTools.processCliArgs(arguments, validators);

    // If the cli arguments are correct, we can launch the interactive prompt
    return inquirer.prompt(prepareQuestions(parameters, choicesLists))
    .then(answers => {
      // Merge the parameters from the command and from the prompt and create the new API
      return performTask(_.merge(parameters, answers));
    });
  });

  return Promise.resolve();
};

/**
 * Prepare the list of questions for the prompt
 * @param  {Object} parameters - parameters that have already been passed to the cli
 * @param  {Object} choicesLists - lists of values for closed choice parameters
 * @return {Array} - a list of questions
 */
function prepareQuestions(parameters, choicesLists) {
  return [{
    type: 'input',
    name: 'lambdaIdentifier',
    message: 'Choose a unique identifier for the Lambda (alphanumeric caracters, "_" and "-" accepted)',
    when: answers => { return !parameters.lambdaIdentifier; },
    validate: input => { return /^[a-z0-9_-]+$/i.test(input); }
  }, {
    type: 'input',
    name: 'timeout',
    message: 'Choose the timeout',
    when: answers => { return !parameters.timeout; },
    validate: input => { return !isNaN(parseInt(input, 10)); }
  }, {
    type: 'list',
    name: 'memory',
    message: 'Choose the memory allocated to the Lambda',
    choices: choicesLists.memory,
    when: answers => { return !parameters.memory; },
    default: '128MB'
  }, {
    type: 'input',
    name: 'role',
    message: 'Choose the execution role',
    when: answers => { return !parameters.role; }
  }, {
    type: 'list',
    name: 'execType',
    message: 'Select an execution type for the Lambda',
    choices: choicesLists.execType,
    when: answers => { return !parameters.execType; },
    default: 'api-endpoints'
  }];
}

/**
 * Create the new lambda
 * @param  {Object} parameters - the parameters provided in the command and in the prompt
 * @return {Promise<null>}
 */
function performTask(parameters) {
  const configFilePath = path.join(process.cwd(), 'lambdas', parameters.lambdaIdentifier);
  return mkdirpAsync(configFilePath)
  .then(() => {
    // We create the configuration file of the Lambda
    let config = {
      params: {
        Timeout: parameters.timeout,
        MemorySize: parameters.memory,
        Role: parameters.role
      },
      includeEndpoints: parameters.execType === 'api-endpoints',
      includeLibs: []
    };

    // We save the specification in a json file
    return fs.writeFileAsync(configFilePath + path.sep + 'config.json', JSON.stringify(config, null, 2));
  })
  .then(() => {
    // We create the lambda handler
    const src = path.join(__dirname, 'templates','lambda.js');
    const dest = path.join(configFilePath, 'lambdas.js');
    return ncpAsync(src, dest);
  })
  .then(() => {
    // We create the execution type
    const src = path.join(__dirname, 'templates', 'exec-types', parameters.execType + '.js');
    const dest = path.join(configFilePath, 'exec.js');
    return ncpAsync(src, dest);
  })
  .then(() => {
    console.log('Lambda created');
  })
  .catch(e => {
    console.log(e);
    console.log(e.stack);
  });
}
