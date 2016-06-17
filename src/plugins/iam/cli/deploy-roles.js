'use strict';

// Nice ES6 syntax
// const { Promise, _, icli } = require('@lager/lager/lib/lager').import;
const lager = require('@lager/lager/lib/lager');
const Promise = lager.import.Promise;
const _ = lager.import._;
const icli = lager.import.icli;

const plugin = lager.getPlugin('iam');

/**
 * This module exports a function that enrich the interactive command line and return a promise
 * @return {Promise} - a promise that resolve when the operation is done
 */
module.exports = () => {
  // First, retrieve possible values for the endpoint-identifiers parameter
  return getChoices()
  .then(choicesLists => {
    const config = {
      cmd: 'deploy-roles',
      description: 'deploy roles',
      parameters: [{
        cmdSpec: '[role-identifiers]',
        type: 'checkbox',
        choices: choicesLists.roleIdentifiers,
        question: {
          message: 'Which roles do you want to deploy?'
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
function getChoices() {
  return plugin.loadRoles()
  .then(roles => {
    // Build the list of available roles for input verification and interactive selection
    return Promise.resolve({
      roleIdentifiers: _.map(roles, role => {
        return {
          value: role.name,
          name: role.name + (role.description ? ' - ' + role.description : '')
        };
      })
    });
  });
}

/**
 * Deploy roles
 * @param  {Object} parameters - the parameters provided in the command and in the prompt
 * @return {Promise<null>} - The execution stops here
 */
function executeCommand(parameters) {
  return plugin.findPRoles(parameters.roleIdentifiers)
  .then((roles) => {
    return Promise.map(roles, role => { return role.deploy(); });
  })
  .then(() => {
    console.log('Roles deployed');
  })
  .catch(e => {
    console.log(e);
    console.log(e.stack);
  });
}
