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
  return plugin.loadPolicies()
  .then(policies => {
    // Build the list of available policies for input verification and interactive selection
    const choicesLists = {
      policyIdentifier: _.map(policies, policy => {
        return {
          value: policy.name,
          name: policy.name + (policy.description ? ' - ' + policy.description : '')
        };
      })
    };
    const validators = {
      policyIdentifier: cliTools.generateListValidator(choicesLists.policyIdentifier, 'policy identifier')
    };

    program
    .command('deploy-policy')
    .description('deploy a policy')
    .arguments('[policy-identifier]')
    .action(function (policyIdentifier, options) {
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
 * @param  {Object} choicesLists - lists of values for closed choice parameters
 * @return {Array}
 */
function prepareQuestions(parameters, choicesLists) {
  return [{
    type: 'list',
    name: 'policyIdentifier',
    message: 'Which policy do you want to deploy?',
    choices: choicesLists.policyIdentifier,
    when: function(currentAnswers) {
      return !parameters.policyIdentifier;
    }
  }];
}

/**
 * Deploy the policy
 * @param  {Object} parameters [description]
 * @return void
 */
function performTask(parameters) {
  return plugin.findPolicy(parameters.policyIdentifier)
  .then((policy) => {
    return policy.deploy();
  })
  .then(() => {
    console.log('Policy deployed');
  })
  .catch(e => {
    console.log(e);
    console.log(e.stack);
  });
}
