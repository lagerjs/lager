'use strict';

// Nice ES6 syntax
// const { Promise, _, icli } = lager.import;
const lager = require('@lager/lager/lib/lager');
const _ = lager.import._;
const icli = lager.import.icli;

/**
 * This module exports a function that enrich the interactive command line and return a promise
 * @returns {Promise} - a promise that resolve when the operation is done
 */
module.exports = () => {
  // We have to require the plugin inside the function
  // Otherwise we could have a circular require occuring when Lager is registering it
  const plugin = lager.getPlugin('api-gateway');

  // First, retrieve possible values for resourcePath and httpMethod parameters
  return plugin.loadEndpoints()
  .then(endpoints => {
    // Build the choices for "list" and "checkbox" parameters
    // including lists of available resource paths and lists of available HTTP methods for each resource path
    const choicesLists = getChoices(endpoints);

    const config = {
      cmd: 'inspect-endpoint',
      description: 'inspect an endpoint specification',
      parameters: [{
        cmdSpec: '[resource-path]',
        type: 'list',
        choices: choicesLists.resourcePath,
        validationMsgLabel: 'resource path',
        question: {
          message: 'What is the resource path of the endpoint that you want to inspect?'
        }
      }, {
        cmdSpec: '[http-method]',
        type: 'list',
        choices: (answers, cmdParameterValues) => { return choicesLists.httpMethod[answers.resourcePath]; },
        validate: (value, answers, cliParameters) => {
          // We construct a validator based on the value selected for "resourcePath"
          // This validator should not be called with the "answer" parameter, because in the prompt
          // the user will have choosen a value in a list and cannot enter something wrong
          // but we test the "answer" parameter anyway to show an example
          const resourcePath = (answers ? answers.resourcePath : null) || cliParameters.resourcePath;
          const validator = icli.generateListValidation(choicesLists.httpMethod[resourcePath], 'http method for the resource path ' + icli.format.info(resourcePath));
          return validator(value);
        },
        question: {
          message: 'What is the http method of the endpoint that you want to inspect?'
        }
      }, {
        cmdSpec: '-c, --colors',
        description: 'highlight output',
        type: 'confirm',
        default: true,
        question: {
          message: 'Do you want to use syntax highlighting?'
        }
      }, {
        cmdSpec: '-s, --spec-version <version>',
        description: 'select the type of specification to retrieve: doc|aws|complete',
        type: 'list',
        choices: choicesLists.specVersion,
        validationMsgLabel: 'specification version',
        question: {
          message: 'Which version of the specification do ou want to see?'
        }
      }]
    };

    /**
     * Create the command and the promp
     */
    return Promise.resolve(icli.createSubCommand(config, executeCommand));
  });
};

/**
 * Build the choices for "list" and "checkbox" parameters
 * @param {Array} endpoints - the list of available endpoint specifications
 * @returns {Object} - collection of lists of choices for "list" and "checkbox" parameters
 */
function getChoices(endpoints) {
  // Build lists of resource paths and http methods
  const lists = _.reduce(endpoints, (choicesLists, endpoint) => {
    const resourcePath = endpoint.getResourcePath();
    const httpMethod = endpoint.getMethod();
    if (choicesLists.resourcePath.indexOf(resourcePath) === -1) {
      choicesLists.resourcePath.push(resourcePath);
      choicesLists.httpMethod[resourcePath] = [];
    }
    if (choicesLists.httpMethod[resourcePath].indexOf(httpMethod) === -1) {
      choicesLists.httpMethod[resourcePath].push(httpMethod);
    }
    return choicesLists;
  }, { resourcePath: [], httpMethod: [] });

  // Build the list of available specification versions for input verification and interactive selection
  lists.specVersion = [
    { value: 'doc', name: icli.format.info('doc') + ' - version of the specification for documentation purpose (Swagger UI, Postman ...)' },
    { value: 'api-gateway', name: icli.format.info('aws') + ' - version of the specification used for publication in API Gateway' },
    { value: 'complete', name: icli.format.info('complete') + ' - version of the specification containing everything (doc + aws)' }
  ];

  return lists;
}

/**
 * Output endpoint specification
 * @param {Object} parameters - the parameters provided in the command and in the prompt
 * @returns {Promise<null>} - The execution stops here
 */
function executeCommand(parameters) {
  return lager.getPlugin('api-gateway').findEndpoint(parameters.resourcePath, parameters.httpMethod)
  .then(endpoint => {
    let spec = JSON.stringify(endpoint.generateSpec(parameters.specVersion), null, 2);
    if (parameters.colors) {
      spec = icli.highlight(spec, { json: true });
    }
    console.log(spec);
  });
}
