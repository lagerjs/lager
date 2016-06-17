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

// @TODO propose to select endpoints
// @TODO reactivate the possibility to select values not proposed in a list

/**
 * This module exports a function that enrich the interactive command line and return a promise
 * @return {Promise} - a promise that resolve when the operation is done
 */
module.exports = () => {
  // We have to require the plugin inside the function
  // Otherwise we could have a circular require occuring when Lager is registering it
  const plugin = lager.getPlugin('api-gateway');

  // First, retrieve possible values for the endpoint-identifiers parameter
  return plugin.loadEndpoints()
  .then(endpoints => {
    // Build the list of available endpoints for interactive selection
    const choicesLists = getChoices(endpoints);

    const config = {
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
        cmdSpec: '-c, --consume <mime-types>',
        description: 'A list of MIME types the API can consume separated by ","',
        type: 'checkbox',
        choices: choicesLists.mimeType,
        question: {
          message: 'What are the MIME types that the API can consume?'
        }
      }, {
        cmdSpec: '-p, --produce <mime-types>',
        description: 'A list of MIME types the API can produce separated by ","',
        type: 'checkbox',
        choices: choicesLists.mimeType,
        question: {
          message: 'What are the MIME types that the API can produce?'
        }
      }]
    };

    /**
     * Create the command and the promp
     */
    return icli.createSubCommand(config, executeCommand);
  });
};

/**
 * Build the choices for "list" and "checkbox" parameters
 * @param  {Array} endpoints - the list o available endpoint specifications
 * @return {Object} - collection of lists of choices for "list" and "checkbox" parameters
 */
function getChoices(endpoints) {
  const choicesLists = {
    endpointsIdentifiers: _.map(endpoints, endpoint => {
      const spec = endpoint.getSpec();
      return {
        value: endpoint.getMethod() + ' ' + endpoint.getResourcePath(),
        name: endpoint.getMethod() + ' ' + endpoint.getResourcePath() + (spec.summary ? ' - ' + spec.summary : '')
      };
    }),
    mimeType: ['application/json', 'text/plain', { value: 'other', label: 'other (you will be prompted to enter a value)'}]
  };
  return choicesLists;
}

/**
 * Create the new api
 * @param  {Object} parameters - the parameters provided in the command and in the prompt
 * @return {Promise<null>}
 */
function executeCommand(parameters) {
  // If a name has been provided, we create the project directory
  const specFilePath = path.join(process.cwd(), 'apis', parameters.apiIdentifier);
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
    msg += '  Its OpenAPI specification is available in \x1b[36m' + specFilePath + path.sep + 'spec.json\x1b[36m\n';
    console.log(msg);
  });
}


// {
//   type: 'input',
//   name: 'consumeOther',
//   message: 'Enter the MIME types that the operation can consume, separated by commas',
//   when: answers => { return !parameters.consume && answers.consume.indexOf('other') !== -1; }
// }, {
//   type: 'input',
//   name: 'produceOther',
//   message: 'Enter the MIME types that the operation can produce, separated by commas',
//   when: answers => { return !parameters.produce && answers.produce.indexOf('other') !== -1; }
// }
