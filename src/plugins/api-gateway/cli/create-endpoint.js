'use strict';

const path = require('path');
const lager = require('@lager/lager/lib/lager');
const Promise = lager.getPromise();
const fs = Promise.promisifyAll(require('fs'));
const mkdirpAsync = Promise.promisify(require('mkdirp'));
const _ = lager.getLodash();
const cliTools = require('@lager/lager/lib/cli-tools');

module.exports = function(program, inquirer) {
  // We have to require the plugin inside the function
  // Otherwise we could have a circular require occuring when Lager is registering it
  const plugin = lager.getPlugin('api-gateway');

  // First, retrieve possible values for the api-identifiers parameter
  return plugin.loadApis()
  .then(apis => {
    // Build the list of available APIs for input verification and interactive selection
    const valueLists = {
      apis: _.map(apis, api => {
        return {
          value: api.spec['x-lager'].identifier,
          label: api.spec['x-lager'].identifier + (api.spec.info && api.spec.info.title ? ' - ' + api.spec.info.title : '')
        };
      }),
      httpMethod: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      mimeType: ['application/json', 'text/plain', { value: 'other', label: 'other (you will be prompted to enter a value)'}]
    };
    const validators = {
      apis: cliTools.generateListValidator(valueLists.apis, 'API identifier'),
      httpMethod: cliTools.generateListValidator(valueLists.httpMethod, 'HTTP method')
    };

    return program
    .command('create-endpoint')
    .alias('new-endpoint')
    .description('create a new endpoint')
    .arguments('[http-method] [resource-path]')
    .option('-a, --apis <api-identifiers>', 'The identifiers of APIs that expose the endpoint separated by ","', cliTools.listParser)
    .option('-s, --summary <endpoint summary>', 'A short summary of what the operation does')
    .option('-c, --consume <mime-types>', 'A list of MIME types the operation can consume separated by ","', cliTools.listParser)
    .option('-p, --produce <mime-types>', 'A list of MIME types the operation can produce separated by ","', cliTools.listParser)
    .action(function(method, resourcePath, options) {
      // transformation specific to this command
      if (arguments[0]) { arguments[0] = arguments[0].toUpperCase(); }

      // Transform cli arguments and options into a parameter map
      let parameters = cliTools.processCliArgs(arguments, validators);

      // If the cli arguments are correct, we can launch the interactive prompt
      return inquirer.prompt(prepareQuestions(parameters, valueLists))
      .then(answers => {
        // Transform answers into correct parameters
        cliTools.processAnswerTypeOther(answers, 'consume');
        cliTools.processAnswerTypeOther(answers, 'produce');

        // Merge the parameters from the command and from the prompt
        parameters =  _.merge(parameters, answers);

        // Specific cleanup of parameters
        if (parameters.resourcePath.charAt(0) !== '/') { parameters.resourcePath = '/' + parameters.resourcePath; }

        return performTask(parameters);
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
    name: 'httpMethod',
    message: 'What is the HTTP method?',
    choices: valueLists.httpMethod,
    when: answers => { return !parameters.httpMethod; }
  }, {
    type: 'input',
    name: 'resourcePath',
    message: 'What is the resource path?',
    when: answers => { return !parameters.resourcePath; }
  }, {
    type: 'input',
    name: 'summary',
    message: 'Shortly, what does the operation do?',
    when: answers => { return !parameters.summary; }
  }, {
    type: 'checkbox',
    name: 'consume',
    message: 'What are the MIME types that the operation can consume?',
    choices: valueLists.mimeType,
    when: answers => { return !parameters.consume; },
    default: ['application/json']
  }, {
    type: 'input',
    name: 'consumeOther',
    message: 'Enter the MIME types that the operation can consume, separated by commas',
    when: answers => { return !parameters.consume && answers.consume.indexOf('other') !== -1; }
  }, {
    type: 'checkbox',
    name: 'produce',
    message: 'What are the MIME types that the operation can produce?',
    choices: valueLists.mimeType,
    when: answers => { return !parameters.produce; },
    default: ['application/json']
  }, {
    type: 'input',
    name: 'produceOther',
    message: 'Enter the MIME types that the operation can produce, separated by commas',
    when: answers => { return !parameters.produce && answers.produce.indexOf('other') !== -1; }
  }, {
    type: 'checkbox',
    name: 'apis',
    message: 'Which APIs should expose this endpoint?',
    choices: _.map(valueLists.apis, 'label'),
    when: answers => { return !parameters.apis; },
    filter: input => { return cliTools.retrieveValuesFromList(valueLists.apis, input); }
  }];
}

/**
 * Create the new endpoint
 * @param  {Object} parameters [description]
 * @return void
 */
function performTask(parameters) {
  // We calculate the path where we will save the specification and create the directory
  // Destructuring parameters only available in node 6 :(
  // specFilePath = path.join(process.cwd(), 'endpoints', ...answers.resourcePath.split('/'));
  let pathParts = parameters.resourcePath.split('/');
  pathParts.push(parameters.httpMethod);
  pathParts.unshift('endpoints');
  pathParts.unshift(process.cwd());
  let specFilePath = path.join.apply(null, pathParts);

  return mkdirpAsync(specFilePath)
  .then(() => {
    // We create the endpoint OpenAPI specification
    let spec = {
      'x-lager': {
        'apis': parameters.apis
      },
      summary: parameters.summary,
      consume: parameters.consume,
      produce: parameters.produce
    };

    // We save the specification in a json file
    return fs.writeFileAsync(specFilePath + path.sep + 'spec.json', JSON.stringify(spec, null, 2));
  })
  .then(() => {
    let msg = '\n  The endpoint ' + cliTools.format.info(parameters.httpMethod + ' ' + parameters.resourcePath) + ' has been created\n\n';
    msg += '  Its OpenAPI specification is available in ' + cliTools.format.info(specFilePath + path.sep + 'spec.json') + '\n';
    msg += '  You can inspect it using the command ' + cliTools.format.cmd('lager inspect-endpoint ' + parameters.httpMethod + ' ' + parameters.resourcePath) + '\n';
    console.log(msg);
  });
}
