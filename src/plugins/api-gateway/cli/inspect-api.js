'use strict';

const lager = require('@lager/lager/lib/lager');
const Promise = lager.getPromise();
const _ = lager.getLodash();
const cliTools = require('@lager/lager/lib/cli-tools');

module.exports = function(program, inquirer) {
  // We have to require the plugin inside the function
  // Otherwise we could have a circular require occuring when Lager is registering it
  const plugin = lager.getPlugin('api-gateway');

  // First, retrieve possible values for the identifier parameter
  return plugin.loadApis()
  .then(apis => {
    // Build the list of available APIs for input verification and interactive selection
    const valueLists = {
      apiIdentifier: _.map(apis, api => {
        return {
          value: api.spec['x-lager'].identifier,
          label: api.spec['x-lager'].identifier + (api.spec.info && api.spec.info.title ? ' - ' + api.spec.info.title : '')
        };
      }),
      specVersion: [
        { value: 'doc', label: 'version of the specification for documentation purpose' },
        { value: 'publish', label: 'version of the specification used for publication in API Gateway' },
        { value: 'complete', label: 'version of the specification unaltered' },
      ]
    };
    const validators = {
      apiIdentifier: cliTools.generateListValidator(valueLists.apiIdentifier, 'API identifier'),
      specVersion: cliTools.generateListValidator(valueLists.specVersion, 'specification version')
    };

    program
    .command('inspect-api')
    .description('inspect an api specification')
    .arguments('[api-identifier]')
    .option('-c, --colors', 'highlight output')
    .option('-t, --type', 'select the type of specification to retrieve: doc, deploy, complete')
    .action(function (apiIdentifier, options) {
      // Transform cli arguments and options into a parameter map
      let parameters = cliTools.processCliArgs(arguments, validators);

      // If the cli arguments are correct, we can prepare the questions for the interactive prompt
      // Launch the interactive prompt
      return inquirer.prompt(prepareQuestions(parameters, valueLists))
      .then(answers => {
        // Merge the parameters provided in the command and in the prompt
        parameters =  _.merge(parameters, answers);
        return plugin.getApiSpec(parameters.apiIdentifier, 'doc', parameters.colors);
      })
      .then(spec => {
        console.log(spec);
      });
    });
  });
};


/**
 * Prepare the list of questions for the prompt
 * @param  {Object} parameters - the parameters that have already been passed to the cli
 * @param  {Object} valueLists - lists of values for closed choice parameters
 * @return {Array}
 */
function prepareQuestions(parameters, valueLists) {
  return [{
    type: 'list',
    name: 'apiIdentifier',
    message: 'Which API do you want to inspect?',
    choices: _.map(valueLists.apiIdentifier, 'label'),
    when: function(currentAnswers) {
      return !parameters.apiIdentifier;
    }
  }, {
    type: 'list',
    name: 'specVersion',
    message: 'Which version of the specification do ou want to see?',
    choices: _.map(valueLists.specVersion, 'label'),
    when: function(currentAnswers) {
      return !parameters.specVersion;
    }
  }];
}
