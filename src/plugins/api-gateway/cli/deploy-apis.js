'use strict';

// Nice ES6 syntax
// const { Promise, _, icli } = require('@lager/lager/lib/lager').import;
const lager = require('@lager/lager/lib/lager');
const Promise = lager.import.Promise;
const _ = lager.import._;
const icli = lager.import.icli;

const plugin = lager.getPlugin('api-gateway');

/**
 * This module exports a function that enrich the interactive command line and return a promise
 * @return {Promise} - a promise that resolve when the operation is done
 */
module.exports = () => {
  // Build the list of available APIs andAWS regions for input verification and interactive selection
  return getChoices()
  .then(choicesLists => {
    const config = {
      cmd: 'deploy-apis',
      description: 'deploy apis',
      parameters: [{
        cmdSpec: '[api-identifiers]',
        type: 'checkbox',
        choices: choicesLists.apiIdentifiers,
        question: {
          message: 'Which APIs do you want to deploy?'
        }
      }, {
        cmdSpec: '-r, --region [region]',
        description: 'select the AWS region',
        type: 'list',
        choices: choicesLists.region,
        validationMsgLabel: 'AWS region',
        question: {
          message: 'On which AWS region do you want to deploy?'
        }
      }, {
        cmdSpec: '-s, --stage [stage]',
        description: 'select the API stage',
        type: 'input',
        default: 'v0',
        question: {
          message: 'Which API stage do you want to deploy?'
        }
      }, {
        cmdSpec: '-e, --environment [environment]',
        description: 'select the environment',
        type: 'input',
        default: 'DEV',
        question: {
          message: 'On which environment do you want to deploy?'
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
 * @param  {Array} apis - the list o available api specifications
 * @return {Object} - collection of lists of choices for "list" and "checkbox" parameters
 */
function getChoices(apis) {
  // First, retrieve possible values for the api-identifiers parameter
  return plugin.loadApis()
  .then(apis => {
    return {
      apiIdentifiers: _.map(apis, api => {
        return {
          value: api.spec['x-lager'].identifier,
          name: icli.format.info(api.spec['x-lager'].identifier) + (api.spec.info && api.spec.info.title ? ' - ' + api.spec.info.title : '')
        };
      }),
      region: [{
        value: 'us-east-1',
        name: icli.format.info('us-east-1') + '      US East (N. Virginia)',
        short: 'us-east-1 - US East (N. Virginia)'
      }, {
        value: 'us-west-2',
        name: icli.format.info('us-west-2') + '      US West (Oregon)',
        short: 'us-west-2 - US West (Oregon)'
      }, {
        value: 'eu-west-1',
        name: icli.format.info('eu-west-1') + '      EU (Ireland)',
        short: 'eu-west-1 - EU (Ireland)'
      }, {
        value: 'eu-central-1',
        name: icli.format.info('eu-central-1') + '   EU (Frankfurt)',
        short: 'eu-central-1 - EU (Frankfurt)'
      }, {
        value: 'ap-northeast-1',
        name: icli.format.info('ap-northeast-1') + ' Asia Pacific (Tokyo)',
        short: 'ap-northeast-1 - Asia Pacific (Tokyo)'
      }, {
        value: 'ap-southeast-1',
        name: icli.format.info('ap-southeast-1') + ' Asia Pacific (Singapore)',
        short: 'ap-southeast-1 - Asia Pacific (Singapore)'
      }]
    };
  });
}

/**
 * Create the new endpoint
 * @param  {Object} parameters - the parameters provided in the command and in the prompt
 * @return {Promise<null>} - The execution stops here
 */
function executeCommand(parameters) {
  return lager.getPlugin('api-gateway').deploy(
    parameters.region,
    parameters.stage,
    parameters.environment
  );
}
