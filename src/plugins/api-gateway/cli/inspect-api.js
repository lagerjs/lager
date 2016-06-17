'use strict';

// Nice ES6 syntax
// const { Promise, _, icli } = require('@lager/lager/lib/lager').import;
const lager = require('@lager/lager/lib/lager');
const Promise = lager.import.Promise;
const _ = lager.import._;
const icli = lager.import.icli;

/**
 * This module exports a function that enrich the interactive command line and return a promise
 * @return {Promise} - a promise that resolve when the operation is done
 */
module.exports = () => {
  // We have to require the plugin inside the function
  // Otherwise we could have a circular require occuring when Lager is registering it
  const plugin = lager.getPlugin('api-gateway');

  // First, retrieve possible values for the identifier parameter
  return plugin.loadApis()
  .then(apis => {
    // Build the list of available APIs for input verification and interactive selection
    const choicesLists = getChoices(apis);

    const config = {
      cmd: 'inspect-api',
      description: 'inspect an api specification',
      parameters: [{
        cmdSpec: '[api-identifier]',
        type: 'list',
        choices: choicesLists.apiIdentifier,
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
 * @param  {Array} apis - the list of available API specifications
 * @return {Object} - collection of lists of choices for "list" and "checkbox" parameters
 */
function getChoices(apis) {
  return {
    apiIdentifier: _.map(apis, api => {
      return {
        value: api.spec['x-lager'].identifier,
        name: icli.format.info(api.spec['x-lager'].identifier) + (api.spec.info && api.spec.info.title ? ' - ' + api.spec.info.title : '')
      };
    }),
    specVersion: [
      { value: 'doc', name: icli.format.info('doc') + ' - version of the specification for documentation purpose (Swagger UI, Postman ...)' },
      { value: 'aws', name: icli.format.info('aws') + ' - version of the specification used for publication in API Gateway' },
      { value: 'complete', name: icli.format.info('complete') + ' - version of the specification containing everything (doc + aws)' }
    ]
  };
}

/**
 * Output API specification
 * @param  {Object} parameters - the parameters provided in the command and in the prompt
 * @return {Promise<null>}
 */
function executeCommand(parameters) {
  return lager.getPlugin('api-gateway').getApiSpec(parameters.apiIdentifier, parameters.specVersion, parameters.colors)
  .then(spec => {
    console.log(spec);
  });
}
