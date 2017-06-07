'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const Table = require('easy-table');

const plugin = require('../index');

/**
 * This module exports a function that enrich the interactive command line and return a promise
 * @returns {Promise} - a promise that resolve when the operation is done
 */
module.exports = (icli) => {
  // First, retrieve possible values for the endpoint-identifiers parameter
  const choicesLists = getChoices();

  const config = {
    section: 'IAM plugin',
    cmd: 'deploy-roles',
    description: 'deploy roles',
    parameters: [{
      cmdSpec: '[role-identifiers]',
      type: 'checkbox',
      choices: choicesLists.roleIdentifiers,
      question: {
        message: 'Which roles do you want to deploy?'
      }
    }, {
      cmdSpec: '-e, --environment <environment>',
      description: 'An environment identifier that will be used as a prefix',
      type: 'input',
      default: plugin.myrmex.getConfig('environment') || 'DEV',
      question: {
        message: 'Enter an environment identifier that will be used as a prefix',
        when: (answers, cmdParameterValues) => {
          return cmdParameterValues['environment'] === undefined && plugin.myrmex.getConfig('environment') === undefined;
        }
      }
    }, {
      cmdSpec: '-s, --stage <stage>',
      description: 'A stage identifier that will be used as a suffix',
      type: 'input',
      default: plugin.myrmex.getConfig('stage') || 'v0',
      question: {
        message: 'Enter a stage identifier that will be used as a suffix',
        when: (answers, cmdParameterValues) => {
          return cmdParameterValues['stage'] === undefined && plugin.myrmex.getConfig('stage') === undefined;
        }
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
   * @param {Array} endpoints - the list o available endpoint specifications
   * @returns {Object} - collection of lists of choices for "list" and "checkbox" parameters
   */
  function getChoices() {
    return {
      roleIdentifiers: () => {
        return plugin.loadRoles()
        .then(roles => {
          // Build the list of available roles for input verification and interactive selection
          return _.map(roles, role => {
            return {
              value: role.name,
              name: role.name + (role.description ? ' - ' + role.description : '')
            };
          });
        });
      }
    };
  }

  /**
   * Deploy roles
   * @param {Object} parameters - the parameters provided in the command and in the prompt
   * @returns {Promise<null>} - The execution stops here
   */
  function executeCommand(parameters) {
    if (parameters.environment === undefined) { parameters.environment = plugin.myrmex.getConfig('environment'); }
    if (parameters.stage === undefined) { parameters.stage = plugin.myrmex.getConfig('stage'); }
    const context = {
      stage: parameters.stage,
      environment: parameters.environment
    };
    return plugin.findRoles(parameters.roleIdentifiers)
    .then(roles => {
      return Promise.map(roles, role => { return role.deploy(context); });
    })
    .then(reports => {
      const t = new Table();
      _.forEach(reports, report => {
        t.cell('Name', report.name);
        t.cell('Operation', report.operation);
        t.cell('ARN', report.arn);
        t.cell('Deploy time', formatHrTime(report.deployTime));
        t.newRow();
      });
      icli.print('\nRoles deployed\n');
      icli.print(t.toString());
    })
    .catch(e => {
      if (e.code === 'AccessDeniedException' && e.cause && e.cause.message) {
        icli.print('\n    ' + icli.format.error('Insufficient permissions to perform the action\n'));
        icli.print('The IAM user/role you are using to perform this action does not have sufficient permissions.\n');
        icli.print(e.cause.message + '\n');
        icli.print('Please update the policies of the user/role before trying again.\n');
        process.exit(1);
      }
      throw e;
    });
  }

};

/**
 * Format the result of process.hrtime() into numeric with 3 decimals
 * @param  {Array} hrTime
 * @return {numeric}
 */
function formatHrTime(hrTime) {
  return (hrTime[0] + hrTime[1] / 1000000000).toFixed(3);
}
