'use strict';

const path = require('path');

// Nice ES6 syntax
// const { Promise, _, icli } = require('@lager/lager/lib/lager').import;
const lager = require('@lager/lager/lib/lager');
const Promise = lager.import.Promise;
const _ = lager.import._;
const icli = lager.import.icli;

const fs = Promise.promisifyAll(require('fs'));
const mkdirpAsync = Promise.promisify(require('mkdirp'));
const ncpAsync = Promise.promisify(require('ncp'));

/**
 * This module exports a function that enrich the interactive command line and return a promise
 * @returns {Promise} - a promise that resolve when the operation is done
 */
module.exports = () => {
  // Build the lists of choices
  const choicesLists = getChoices();

  const config = {
    cmd: 'create-lambda',
    description: 'create a new lambda',
    parameters: [{
      cmdSpec: '[lambda-identifier]',
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
      cmdSpec: '-m, --memory <memory>>',
      description: 'select the memory (in MB)',
      type: 'list',
      choices: choicesLists.memory,
      question: {
        message: 'Choose the memory'
      }
    }, {
      // @TODO: should be a list
      cmdSpec: '-r, --role <role>',
      description: 'select the execution role',
      type: 'input',
      question: {
        message: 'Choose the execution role'
      }
    }, {
      cmdSpec: '-e, --exec-type <execution-type>',
      description: 'select the type of execution to associate to the lambda',
      type: 'list',
      choices: choicesLists.execType,
      default: choicesLists.execType[0],
      question: {
        message: 'Select an execution type'
      }
    }]
  };

  /**
   * Create the command and the promp
   */
  return icli.createSubCommand(config, executeCommand);
};

/**
 * Build the choices for "list" and "checkbox" parameters
 * @param {Array} endpoints - the list o available endpoint specifications
 * @returns {Object} - collection of lists of choices for "list" and "checkbox" parameters
 */
function getChoices() {
  const memoryValues = [];
  for (let i = 128; i <= 1536; i += 64) {
    memoryValues.push({ value: i, name: _.padStart(i, 4) + ' MB' });
  }
  const choicesLists = {
    memory: memoryValues,
    execType: [{
      value: 'api-endpoints',
      name: icli.format.info('api-endpoints') + ' - With this type of execution, the Lambda will execute endpoints defined by the api-gateway plugin'
    }, {
      value: 'none',
      name: icli.format.info('none') + ' - Do not add an execution type to the Lambda, you will write a custom one'
    }]
  };
  return choicesLists;
}

/**
 * Create the new lambda
 * @param {Object} parameters - the parameters provided in the command and in the prompt
 * @returns {Promise<null>} - The execution stops here
 */
function executeCommand(parameters) {
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
