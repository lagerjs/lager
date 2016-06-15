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
    // Build the list of available resource paths and lists of available HTTP methods for each resource path
    const choicesLists = _.reduce(endpoints, (choicesLists, endpoint) => {
      const resourcePath = endpoint.getResourcePath();
      const httpMethod = endpoint.getMethod();
      if (choicesLists.resourcePath.indexOf(resourcePath) === -1) {
        choicesLists.resourcePath.push(resourcePath);
        choicesLists.httpMethod[resourcePath] = [];
      }
      if (choicesLists.httpMethod[resourcePath].indexOf(httpMethod) === -1) {
        choicesLists.httpMethod[resourcePath].push(httpMethod);
      }
      return choicesLists;
    }, { resourcePath: [], httpMethod: [] });
    // Build the list of available specification versions for input verification and interactive selection
    choicesLists.specVersion = [
      { value: 'doc', name: cliTools.format.info('doc') + ' - version of the specification for documentation purpose (Swagger UI, Postman ...)' },
      { value: 'aws', name: cliTools.format.info('aws') + ' - version of the specification used for publication in API Gateway' },
      { value: 'complete', name: cliTools.format.info('complete') + ' - version of the specification containing everything (doc + aws)' }
    ];
    const validators = {
      resourcePath: cliTools.generateListValidator(choicesLists.resourcePath, 'resource path'),
      specVersion: cliTools.generateListValidator(choicesLists.specVersion, 'specification version')
    };
    _.forEach(choicesLists.httpMethod, (httpMethods, resourcePath) => {
      validators[resourcePath] = cliTools.generateListValidator(httpMethods, 'http method for the resource path ' + cliTools.format.info(resourcePath));
    });


    program
    .command('inspect-endpoint [resource-path] [http-method]')
    .description('inspect an endpoint specification')
    .option('-c, --colors', 'output with colors')
    .option('-s, --spec-version <version>', 'select the type of specification to retrieve: doc|aws|complete')
    .action(function (resourcePath, httpMethod, options) {
      // Transform cli arguments and options into a parameter map
      let parameters = cliTools.processCliArgs(arguments, validators);

      // If the cli arguments are correct, we can prepare the questions for the interactive prompt
      // Launch the interactive prompt
      return inquirer.prompt(prepareQuestions(parameters, choicesLists))
      .then(answers => {
        // Merge the parameters provided in the command and in the prompt
        parameters =  _.merge(parameters, answers);
        return plugin.getEndpointSpec(parameters.httpMethod, parameters.resourcePath, parameters.specVersion, parameters.colors);
      })
      .then(spec => {
        console.log(spec);
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
    name: 'resourcePath',
    message: 'What is the resource path of the endpoint that you want to inspect?',
    choices: choicesLists.resourcePath,
    when: answers => {
      return !parameters.resourcePath;
    }
  }, {
    type: 'list',
    name: 'httpMethod',
    message: 'What is the http method of the endpoint that you want to inspect?',
    choices: answers => { return choicesLists.httpMethod[answers.resourcePath]; },
    when: answers => {
      return !parameters.httpMethod;
    }
  }, {
    type: 'list',
    name: 'specVersion',
    message: 'Which version of the specification do ou want to see?',
    choices: choicesLists.specVersion,
    when: answers => {
      return !parameters.specVersion;
    }
  }];
}
