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

  // First, retrieve possible values for the endpoint-identifiers parameter
  return plugin.loadEndpoints()
  .then(endpoints => {
    // Build the list of available endpoints for interactive selection
    const valueLists = {
      endpointsIdentifiers: _.map(endpoints, endpoint => {
        let spec = endpoint.getSpec();
        return {
          value: endpoint.getMethod() + ' ' + endpoint.getResourcePath(),
          label: endpoint.getMethod() + ' ' + endpoint.getResourcePath() + (spec.summary ? ' - ' + spec.summary : '')
        };
      }),
      mimeType: ['application/json', 'text/plain', { value: 'other', label: 'other (you will be prompted to enter a value)'}]
    };


    return program
    .command('create-api')
    .alias('new-api')
    .description('create a new API')
    .arguments('[api-identifier]')
    .option('-t, --title <title>', 'The title of the API')
    .option('-d, --description <description>', 'A short description of the API')
    .option('-c, --consume <mime-types>', 'A list of MIME types the operation can consume separated by ","', cliTools.listParser)
    .option('-p, --produce <mime-types>', 'A list of MIME types the operation can produce separated by ","', cliTools.listParser)
    .action(function(apiIdentifier, options) {
      // Transform cli arguments and options into a parameter map
      let parameters = cliTools.processCliArgs(arguments, []);

      // If the cli arguments are correct, we can launch the interactive prompt
      return inquirer.prompt(prepareQuestions(parameters, valueLists))
      .then(answers => {
        // Transform answers into correct parameters
        cliTools.processAnswerTypeOther(answers, 'consume');
        cliTools.processAnswerTypeOther(answers, 'produce');

        // Merge the parameters from the command and from the prompt and create the new API
        return performTask(_.merge(parameters, answers));
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
    name: 'apiIdentifier',
    message: 'Choose a unique identifier for the new API (alphanumeric caracters, "_" and "-" accepted)',
    when: answers => { return !parameters.apiIdentifier; },
    validate: input => { return /^[a-z0-9_-]+$/i.test(input); }
  }, {
    type: 'input',
    name: 'title',
    message: 'Choose a short title for the API',
    when: answers => { return !parameters.title; }
  }, {
    type: 'input',
    name: 'description',
    message: 'You can write a more complete description of the API here',
    when: answers => { return !parameters.description; }
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
  }];
}


/**
 * Create the new endpoint
 * @param  {Object} parameters [description]
 * @return void
 */
function performTask(parameters) {
  // If a name has been provided, we create the project directory
  const specFilePath = path.join(process.cwd(), 'apis', parameters.apiIdentifier);
  return mkdirpAsync(specFilePath)
  .then(() => {
    const spec = {
      swagger: '2.0',
      info: {
        title: parameters.title,
        description: parameters.description
      },
      schemes: ['https'],
      host: 'API_ID.execute-api.REGION.amazonaws.com',
      consume: parameters.consume,
      produce: parameters.produce,
      paths: {},
      definitions: {}
    };
    return fs.writeFileAsync(specFilePath + path.sep + 'spec.json', JSON.stringify(spec, null, 2));
  })
  .then(() => {
    let msg = '\n  A new API has been created!\n\n';
    msg += '  Its OpenAPI specification is available in \x1b[36m' + specFilePath + path.sep + 'spec.json\x1b[36m\n';
    console.log(msg);
  });
}
