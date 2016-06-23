'use strict';

// Nice ES6 syntax
// const { Promise, _, icli } = require('@lager/lager/src/lib/lager').import;
const lager = require('@lager/lager/src/lib/lager');
const Promise = lager.import.Promise;
const _ = lager.import._;
const icli = lager.import.icli;

const plugin = lager.getPlugin('iam');

/**
 * This module exports a function that enrich the interactive command line and return a promise
 * @returns {Promise} - a promise that resolve when the operation is done
 */
module.exports = () => {
  // First, retrieve possible values for the endpoint-identifiers parameter
  return getChoices()
  .then(choicesLists => {
    const config = {
      section: 'IAM plugin',
      cmd: 'deploy-policies',
      description: 'deploy policies',
      parameters: [{
        cmdSpec: '[policy-identifiers]',
        type: 'checkbox',
        choices: choicesLists.policyIdentifiers,
        question: {
          message: 'Which policies do you want to deploy?'
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
 * @param {Array} endpoints - the list o available endpoint specifications
 * @returns {Object} - collection of lists of choices for "list" and "checkbox" parameters
 */
function getChoices() {
  return plugin.loadPolicies()
  .then(policies => {
    // Build the list of available policies for input verification and interactive selection
    return Promise.resolve({
      policyIdentifiers: _.map(policies, policy => {
        return {
          value: policy.name,
          name: policy.name + (policy.description ? ' - ' + policy.description : '')
        };
      })
    });
  });
}

/**
 * Deploy policies
 * @param {Object} parameters - the parameters provided in the command and in the prompt
 * @returns {Promise<null>} - The execution stops here
 */
function executeCommand(parameters) {
  return plugin.findPolicies(parameters.policyIdentifiers)
  .then((policies) => {
    return Promise.map(policies, policy => { return policy.deploy(); });
  })
  .then(() => {
    console.log('Policies deployed');
  })
  .catch(e => {
    console.log(e);
    console.log(e.stack);
  });
}
