'use strict';

const path = require('path');

// Nice ES6 syntax
// const { Promise, _, icli } = require('@lager/lager/lib/lager').import;
const lager = require('@lager/lager/lib/lager');
const Promise = lager.import.Promise;
const _ = lager.import._;
const icli = lager.import.icli;

const fs = Promise.promisifyAll(require('fs'));
const mkdirpAsync = Promise.promisify(require('mkdirp'));

const apiGatewayPlugin = lager.getPlugin('api-gateway');
const iamPlugin = lager.getPlugin('iam');

/**
 * This module exports a function that enrich the interactive command line and return a promise
 * @returns {Promise} - a promise that resolve when the operation is done
 */
module.exports = () => {
  // First, retrieve possible values for the api-identifiers parameter
  return getChoices()
  .then(choicesLists => {
    const config = {
      cmd: 'create-endpoint',
      description: 'create a new API endpoint',
      parameters: [{
        cmdSpec: '[resource-path]',
        type: 'input',
        question: {
          message: 'What is the resource path?'
        }
      }, {
        cmdSpec: '[http-method]',
        type: 'list',
        choices: choicesLists.httpMethod,
        question: {
          message: 'What is the HTTP method?'
        }
      }, {
        cmdSpec: '-a, --apis <api-identifiers>',
        description: 'The identifiers of APIs that expose the endpoint separated by ","',
        type: 'checkbox',
        choices: choicesLists.apis,
        question: {
          message: 'Which APIs should expose this endpoint?'
        }
      }, {
        cmdSpec: '-s, --summary <endpoint summary>',
        description: 'A short summary of what the operation does',
        type: 'input',
        question: {
          message: 'Shortly, what does the operation do?'
        }
      }, {
        cmdSpec: '-c, --consume <mime-types>',
        description: 'A list of MIME types the operation can consume separated by ","',
        type: 'checkbox',
        choices: choicesLists.mimeType,
        default: [choicesLists.mimeType[0]],
        question: {
          message: 'What are the MIME types that the operation can consume?'
        }
      }, {
        cmdSpec: '-p, --produce <mime-types>',
        description: 'A list of MIME types the operation can produce separated by ","',
        type: 'checkbox',
        choices: choicesLists.mimeType,
        default: [choicesLists.mimeType[0]],
        question: {
          message: 'What are the MIME types that the operation can produce?'
        }
      }, {
        cmdSpec: '--credentials <role-name|role-arn>',
        description: 'The credentials used by API Gateway to call the integration',
        type: 'list',
        choices: choicesLists.credentials,
        question: {
          message: 'What are the credentials used by API Gateway to call the integration?',
          when(answers, cmdParameterValues) { return choicesLists.credentials && choicesLists.credentials.length > 0; }
        }
      }, {
        type: 'input',
        question: {
          name: 'credentialsInput',
          message: 'What are the credentials used by API Gateway to call the integration?',
          when(answers, cmdParameterValues) { return !answers.credentials && !cmdParameterValues.credentials; }
        }
      }],
      commanderActionHook() {
        if (arguments[1]) { arguments[1] = arguments[1].toUpperCase(); }
        return arguments;
      },
      inquirerPromptHook(answers, commandParameterValues) {
        if (answers.credentialsInput) {
          answers.credentials = answers.credentialsInput;
        }
        return Promise.resolve([answers, commandParameterValues]);
      }
    };

    /**
     * Create the command and the promp
     */
    return icli.createSubCommand(config, executeCommand);
  });
};

/**
 * Build the choices for "list" and "checkbox" parameters
 * @returns {Object} - collection of lists of choices for "list" and "checkbox" parameters
 */
function getChoices() {
  // First, retrieve possible values for the api-identifiers parameter
  const choicesLists = {
    httpMethod: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    mimeType: ['application/json', 'text/plain', { value: 'other', name: 'other (you will be prompted to enter a value)'}]
  };

  const rolesPromise = iamPlugin ? iamPlugin.loadRoles() : [];
  return Promise.all([apiGatewayPlugin.loadApis(), rolesPromise])
  .spread((apis, roles) => {
    choicesLists.apis = _.map(apis, api => {
      return {
        value: api.getIdentifier(),
        name: icli.format.info(api.getIdentifier()) + (api.spec.info && api.spec.info.title ? ' - ' + api.spec.info.title : '')
      };
    });
    choicesLists.credentials = _.map(roles, role => {
      return {
        value: role.getName(),
        name: icli.format.info(role.getName())
      };
    });
    return choicesLists;
  });
}

/**
 * Create the new endpoint
 * @param {Object} parameters - the parameters provided in the command and in the prompt
 * @returns {Promise<null>} - The execution stops here
 */
function executeCommand(parameters) {
  if (parameters.resourcePath.charAt(0) !== '/') { parameters.resourcePath = '/' + parameters.resourcePath; }

  // We calculate the path where we will save the specification and create the directory
  // Destructuring parameters only available in node 6 :(
  // specFilePath = path.join(process.cwd(), 'endpoints', ...answers.resourcePath.split('/'));
  const pathParts = parameters.resourcePath.split('/');
  pathParts.push(parameters.httpMethod);
  pathParts.unshift('endpoints');
  pathParts.unshift(apiGatewayPlugin.getPath());
  const specFilePath = path.join.apply(null, pathParts);

  return mkdirpAsync(specFilePath)
  .then(() => {
    // We create the endpoint OpenAPI specification
    const spec = {
      'x-lager': {
        'apis': parameters.apis
      },
      summary: parameters.summary,
      consume: parameters.consume,
      produce: parameters.produce,
      "x-amazon-apigateway-integration": {
        credentials: parameters.credentials
      }
    };

    // We save the specification in a json file
    return fs.writeFileAsync(specFilePath + path.sep + 'spec.json', JSON.stringify(spec, null, 2));
  })
  .then(() => {
    let msg = '\n  The endpoint ' + icli.format.info(parameters.httpMethod + ' ' + parameters.resourcePath) + ' has been created\n\n';
    msg += '  Its OpenAPI specification is available in ' + icli.format.info(specFilePath + path.sep + 'spec.json') + '\n';
    msg += '  You can inspect it using the command ' + icli.format.cmd('lager inspect-endpoint ' + parameters.resourcePath + ' ' + parameters.httpMethod) + '\n';
    console.log(msg);
  });
}
