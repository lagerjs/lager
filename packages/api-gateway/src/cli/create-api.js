'use strict';

const path = require('path');
const Promise = require('bluebird');
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
    cmd: 'create-api',
    description: 'create a new API',
    parameters: [{
      cmdSpec: '[api-identifier]',
      type: 'input',
      validate: input => { return /^[a-z0-9_-]+$/i.test(input); },
      question: {
        message: 'Choose a unique identifier for the new API (alphanumeric caracters, "_" and "-" accepted)'
      }
    }, {
      cmdSpec: '-t, --title <title>',
      description: 'The title of the API',
      type: 'input',
      question: {
        default: (answers, cmdParameterValues) => {
          return cmdParameterValues.apiIdentifier || answers.apiIdentifier;
        },
        message: 'Choose a short title for the API'
      }
    }, {
      cmdSpec: '-d, --desc <description>',
      description: 'A description of the API',
      type: 'input',
      question: {
        default: (answers, cmdParameterValues) => {
          return (cmdParameterValues.apiIdentifier || answers.apiIdentifier) + ' - an API built with Myrmex';
        },
        message: 'You can write a more complete description of the API here'
      }
    }],
    execute: executeCommand
  };

  /**
   * Create the command and the prompt
   */
  return icli.createSubCommand(config);

  /**
   * Create the new api
   * @param {Object} parameters - the parameters provided in the command and in the prompt
   * @returns {Promise<null>} - The execution stops here
   */
  function executeCommand(parameters) {
    // If a name has been provided, we create the project directory
    const specFilePath = path.join(process.cwd(), plugin.config.apisPath, parameters.apiIdentifier);
    return mkdirpAsync(specFilePath)
    .then(() => {
      const spec = {
        swagger: '2.0',
        info: {
          title: parameters.title,
          description: parameters.desc
        },
        schemes: ['https'],
        host: 'API_ID.execute-api.REGION.amazonaws.com',
        consume: parameters.consume,
        produce: parameters.produce,
        paths: {},
        definitions: {}
      };
      return fs.writeFileAsync(specFilePath + path.sep + 'spec.json', JSON.stringify(spec, null, 2));
    })
    .then(() => {
      const msg = '\n  The API "' + icli.format.info(parameters.apiIdentifier) + '" has been created\n\n'
              + '  Its Swagger specification is available in ' + icli.format.info(specFilePath + path.sep + 'spec.json') + '\n'
              + '  You can inspect it using the command ' + icli.format.cmd('myrmex inspect-api ' + parameters.apiIdentifier) + '\n';
      icli.print(msg);
    });
  }

};
