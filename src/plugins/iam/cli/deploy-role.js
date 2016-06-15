'use strict';

const lager = require('@lager/lager/lib/lager');
const Promise = lager.getPromise();
const _ = lager.getLodash();
const cliTools = require('@lager/lager/lib/cli-tools');
const plugin = lager.getPlugin('iam');

module.exports = (program, inquirer) => {
  // We have to require the plugin inside the function
  // Otherwise we could have a circular require occuring when Lager is registering it

  // First, retrieve possible values for the identifier parameter
  return plugin.loadRoles()
  .then(roles => {
    // Build the list of available roles for input verification and interactive selection
    const choicesLists = {
      roleIdentifier: _.map(roles, role => {
        return {
          value: role.name,
          name: role.name + (role.description ? ' - ' + role.description : '')
        };
      })
    };
    const validators = {
      roleIdentifier: cliTools.generateListValidator(choicesLists.roleIdentifier, 'role identifier')
    };

    program
    .command('deploy-role')
    .description('deploy a role')
    .arguments('[role-identifier]')
    .action(function (roleIdentifier, options) {
      // Transform cli arguments and options into a parameter map
      let parameters = cliTools.processCliArgs(arguments, validators);

      // If the cli arguments are correct, we can launch the interactive prompt
      return inquirer.prompt(prepareQuestions(parameters, choicesLists))
      .then(answers => {
        // Merge the parameters from the command and from the prompt and create the new API
        return performTask(_.merge(parameters, answers));
      });
    });

    return Promise.resolve();
  });
};

/**
 * Prepare the list of questions for the prompt
 * @param  {Object} parameters - the parameters that have already been passed to the cli
 * @param  {Object} valueLists - lists of values for closed choice parameters
 * @return {Array}
 */
function prepareQuestions(parameters, choicesLists) {
  return [{
    type: 'list',
    name: 'roleIdentifier',
    message: 'Which role do you want to deploy?',
    choices: choicesLists.roleIdentifier,
    when: function(currentAnswers) {
      return !parameters.roleIdentifier;
    }
  }];
}

/**
 * Deploy role
 * @param  {Object} parameters [description]
 * @return void
 */
function performTask(parameters) {
  return plugin.findRole(parameters.roleIdentifier)
  .then((role) => {
    return role.deploy();
  })
  .then(() => {
    console.log('Role deployed');
  })
  .catch(e => {
    console.log(e);
    console.log(e.stack);
  });
}
