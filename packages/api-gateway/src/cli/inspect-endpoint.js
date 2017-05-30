'use strict';

const _ = require('lodash');

const plugin = require('../index');

/**
 * This module exports a function that enrich the interactive command line and return a promise
 * @returns {Promise} - a promise that resolve when the operation is done
 */
module.exports = (icli) => {

  // Build the choices for "list" and "checkbox" parameters
  // including lists of available resource paths and lists of available HTTP methods for each resource path
  const choicesLists = getChoices();

  const config = {
    section: 'Api Gateway plugin',
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
      choices: choicesLists.httpMethod,
      question: {
        message: 'What is the http method of the endpoint that you want to inspect?'
      }
    }, {
      cmdSpec: '-c, --colors',
      description: 'highlight output',
      type: 'confirm',
      default: true,
      question: {
        message: 'Do you want to use syntax highlighting?',
        when: (answers, cmdParameterValues) => {
          return cmdParameterValues.colors === undefined && plugin.myrmex.getConfig('colors') === undefined;
        }
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
    }],
    commanderActionHook() {
      // Uppercase the HTTP method
      if (arguments[1]) { arguments[1] = arguments[1].toUpperCase(); }
      return arguments;
    },
    execute: executeCommand
  };

  /**
   * Create the command and the prompt
   */
  return icli.createSubCommand(config);

  /**
   * Build the choices for "list" and "checkbox" parameters
   * @returns {Object} - collection of lists of choices for "list" and "checkbox" parameters
   */
  function getChoices() {
    const choicesLists = {
      // Build the list of available specification versions for input verification and interactive selection
      specVersion: [
        { value: 'doc', name: icli.format.info('doc') + ' - version of the specification for documentation purpose (Swagger UI, Postman ...)' },
        { value: 'api-gateway', name: icli.format.info('aws') + ' - version of the specification used for publication in API Gateway' },
        { value: 'complete', name: icli.format.info('complete') + ' - version of the specification containing everything (doc + aws)' }
      ]
    };

    // Build lists of resource paths and http methods
    choicesLists.resourcePath = () => {
      return plugin.loadEndpoints()
      .then(endpoints => {
        if (!endpoints.length) {
          icli.print(icli.format.error('This project does not contain any endpoint.'));
          process.exit(1);
        }
        const resourcePaths = [];
        _.forEach(endpoints, endpoint => {
          if (_.findIndex(resourcePaths, rp => { return rp.value === endpoint.getResourcePath(); }) === -1) {
            const spec = endpoint.getSpec();
            resourcePaths.push({
              value: endpoint.getResourcePath(),
              name: endpoint.getResourcePath() + (spec.summary ? ' - ' + spec.summary : '')
            });
          }
        });
        return resourcePaths;
      });
    };

    choicesLists.httpMethod = function(answers, cmdParameterValues) {
      // @FIXME comquirer is not able to validate a list for a question, using the command parameter values
      if (answers) {
        const resourcePath = answers.resourcePath || cmdParameterValues.resourcePath;
        return plugin.loadEndpoints()
        .then(endpoints => {
          const httpMethods = [];
          _.forEach(endpoints, endpoint => {
            if (endpoint.getResourcePath() === resourcePath) {
              httpMethods.push(endpoint.getMethod());
            }
          });
          return httpMethods;
        });
      }
      // @FIXME so we list all possible methods
      return _.concat(plugin.httpMethods, _.map(plugin.httpMethods, String.toLowerCase));
    };

    return choicesLists;
  }

  /**
   * Output endpoint specification
   * @param {Object} parameters - the parameters provided in the command and in the prompt
   * @returns {Promise<null>} - The execution stops here
   */
  function executeCommand(parameters) {
    if (parameters.colors === undefined) { parameters.colors = plugin.myrmex.getConfig('colors'); }

    return plugin.findEndpoint(parameters.resourcePath, parameters.httpMethod)
    .then(endpoint => {
      const jsonSpec = endpoint.generateSpec(parameters.specVersion);
      let spec = JSON.stringify(jsonSpec, null, 2);
      if (parameters.colors) {
        spec = icli.highlight(spec, { json: true });
      }
      icli.print(spec);
      return Promise.resolve(jsonSpec);
    });
  }

};
