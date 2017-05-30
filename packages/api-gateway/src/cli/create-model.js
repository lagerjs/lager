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
    section: 'Api Gateway plugin',
    cmd: 'create-model',
    description: 'create a new model',
    parameters: [{
      cmdSpec: '[name]',
      type: 'input',
      validate: input => { return /^[a-z0-9_-]+$/i.test(input); },
      question: {
        message: 'Choose a unique name for the new model'
      }
    }],
    execute: executeCommand
  };

  /**
   * Create the command and the prompt
   */
  return icli.createSubCommand(config);

  /**
   * Create the new model
   * @param {Object} parameters - the parameters provided in the command and in the prompt
   * @returns {Promise<null>} - The execution stops here
   */
  function executeCommand(parameters) {
    // If a name has been provided, we create the project directory
    const modelFilePath = path.join(process.cwd(), plugin.config.modelsPath);
    return mkdirpAsync(modelFilePath)
    .then(() => {
      const model = {
        type: 'object',
        properties: {}
      };
      return fs.writeFileAsync(modelFilePath + path.sep + parameters.name + '.json', JSON.stringify(model, null, 2));
    })
    .then(() => {
      let msg = '\n  A new model has been created!\n\n';
      msg += '  Its Swagger specification is available in ' + icli.format.info(modelFilePath + path.sep + parameters.name + '.json') + '\n';
      icli.print(msg);
    });
  }

};
