'use strict';

const _ = require('lodash');

const plugin = require('../index');

/**
 * This module exports a function that enrich the interactive command line and return a promise
 * @returns {Promise} - a promise that resolve when the operation is done
 */
module.exports = (icli) => {

  // Build the lists of choices
  const choicesLists = getChoices();

  const config = {
    section: 'Api Gateway plugin',
    cmd: 'inspect-api',
    description: 'inspect an api specification',
    parameters: [{
      cmdSpec: '[api-identifier]',
      type: 'list',
      choices: choicesLists.apiIdentifiers,
      validationMsgLabel: 'API identifier',
      question: {
        message: 'Which API do you want to inspect?'
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
    return {
      apiIdentifiers: () => {
        return plugin.loadApis()
        .then(apis => {
          if (!apis.length) {
            icli.print(icli.format.error('This project does not contain any API.'));
            process.exit(1);
          }
          return _.map(apis, api => {
            return {
              value: api.getIdentifier(),
              name: icli.format.info(api.getIdentifier()) + (api.spec.info && api.spec.info.title ? ' - ' + api.spec.info.title : '')
            };
          });
        });
      },
      specVersion: [
        { value: 'doc', name: icli.format.info('doc') + ' - version of the specification for documentation purpose (Swagger UI, Postman ...)' },
        { value: 'api-gateway', name: icli.format.info('aws') + ' - version of the specification used for publication in API Gateway' },
        { value: 'complete', name: icli.format.info('complete') + ' - version of the specification containing everything (doc + aws)' }
      ]
    };
  }

  /**
   * Output API specification
   * @param {Object} parameters - the parameters provided in the command and in the prompt
   * @returns {Promise<null>} - The execution stops here
   */
  function executeCommand(parameters) {
    if (parameters.colors === undefined) {
      parameters.colors = plugin.myrmex.getConfig('colors');
    }
    return plugin.findApi(parameters.apiIdentifier)
    .then(api => {
      return api.generateSpec(parameters.specVersion);
    })
    .then(jsonSpec => {
      let spec = JSON.stringify(jsonSpec, null, 2);
      if (parameters.colors) {
        spec = icli.highlight(spec, { json: true });
      }
      icli.print(spec);
      return Promise.resolve(jsonSpec);
    });
  }

};
