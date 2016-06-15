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
  return plugin.loadEndpoints()
  .then(endpoints => {
    // @TODO create lists and validations for http-method and resource-path
    // Build the list of available APIs for input verification and interactive selection
    const valueLists = {
      specVersion: [
        { value: 'doc', label: 'version of the specification for documentation purpose' },
        { value: 'publish', label: 'version of the specification used for publication in API Gateway' },
        { value: 'complete', label: 'version of the specification unaltered' },
      ]
    };
    const validators = {
      specVersion: cliTools.generateListValidator(valueLists.specVersion, 'specification version')
    };


    program
    .command('inspect-endpoint <http-method> <resource-path>')
    .description('inspect an endpoint specification')
    .option('-c, --colors', 'output with colors')
    .action(function (method, resourcePath, options) {
      // Transform cli arguments and options into a parameter map
      let parameters = cliTools.processCliArgs(arguments, validators);

      // If the cli arguments are correct, we can prepare the questions for the interactive prompt
      // Launch the interactive prompt
      return inquirer.prompt(prepareQuestions(parameters, valueLists))
      .then(answers => {
        // Merge the parameters provided in the command and in the prompt
        parameters =  _.merge(parameters, answers);
        return plugin.getEndpointSpec(parameters.httpMethod, parameters.resourcePath, 'doc', parameters.colors);
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
    type: 'input',
    name: 'httpMethod',
    message: 'What is the http method of the endpoint that you want to inspect?',
    when: function(currentAnswers) {
      return !parameters.httpMethod;
    }
  }, {
    type: 'input',
    name: 'resourcePath',
    message: 'What is the resource path of the endpoint that you want to inspect?',
    when: function(currentAnswers) {
      return !parameters.resourcePath;
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
