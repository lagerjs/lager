'use strict';

const Promise = require('bluebird');
const _ = require('lodash');

const path = require('path');
const fs = Promise.promisifyAll(require('fs'));
const mkdirpAsync = Promise.promisify(require('mkdirp'));

const plugin = require('../index');

// @TODO propose to select endpoints
// @TODO reactivate the possibility to select values not proposed in a list

/**
 * This module exports a function that enrich the interactive command line and return a promise
 * @returns {Promise} - a promise that resolve when the operation is done
 */
module.exports = (icli) => {

  // Build the list of available endpoints for interactive selection
  const choicesLists = getChoices();

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
        message: 'Choose a short title for the API'
      }
    }, {
      cmdSpec: '-d, --desc <description>',
      description: 'A description of the API',
      type: 'input',
      question: {
        message: 'You can write a more complete description of the API here'
      }
    }, {
      cmdSpec: '-e, --endpoints <endpoints>',
      description: 'The endpoints exposed by the API separated by ","',
      type: 'checkbox',
      choices: choicesLists.endpoints,
      question: {
        message: 'Which endpoints does this API expose?',
        when: (answers, cmdParameterValues) => {
          return choicesLists.endpoints()
          .then(endpoints => {
            return endpoints.length > 0 && !cmdParameterValues['endpoints'];
          });
        }
      }
    }]
  };

  /**
   * Create the command and the promp
   */
  return icli.createSubCommand(config, executeCommand);


  /**
   * Build the choices for "list" and "checkbox" parameters
   * @returns {Object} - collection of lists of choices for "list" and "checkbox" parameters
   */
  function getChoices() {
    return {
      endpoints: () => {
        return plugin.loadEndpoints()
        .then(endpoints => {
          return _.map(endpoints, endpoint => {
            const spec = endpoint.getSpec();
            return {
              value: endpoint.getMethod() + ' ' + endpoint.getResourcePath(),
              name: endpoint.getMethod() + ' ' + endpoint.getResourcePath() + (spec.summary ? ' - ' + spec.summary : '')
            };
          });
        });
      }
    };
  }

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
      let msg = '\n  A new API has been created!\n\n';
      msg += '  Its OpenAPI specification is available in ' + icli.format.info(specFilePath + path.sep + 'spec.json') + '\n';
      console.log(msg);
    });
  }

};
