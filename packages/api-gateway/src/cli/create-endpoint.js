'use strict';

const Promise = require('bluebird');
const _ = require('lodash');

const path = require('path');
const fs = Promise.promisifyAll(require('fs'));
const mkdirpAsync = Promise.promisify(require('mkdirp'));
const ncpAsync = Promise.promisify(require('ncp'));

const plugin = require('../index');

/**
 * This module exports a function that enrich the interactive command line and return a promise
 * @returns {Promise} - a promise that resolve when the operation is done
 */
module.exports = (icli) => {

  // Build the lists of choices
  const choicesLists = getChoices();

  const config = {
    section: 'Api Gateway plugin',
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
      cmdSpec: '--auth <authentication-type>',
      description: 'The type of authentication used to call the endpoint (aws_iam|none)',
      type: 'list',
      choices: choicesLists.auth,
      question: {
        message: 'What is the authentication type used to access to this endpoint?'
      }
    }, {
      cmdSpec: '-l --lambda <lambda-name|lambda-arn>',
      description: 'The Lambda to integrate with the endpoint',
      type: 'list',
      choices: choicesLists.lambdas,
      question: {
        message: 'What is the Lambda to integrate with the endpoint?',
        when(answers, cmdParameterValues) {
          if (cmdParameterValues.lambda) {
            return false;
          }
          return choicesLists.lambdas().then(lambdas => {
            return lambdas.length > 0;
          });
        }
      }
    }, {
      cmdSpec: '--credentials <role-name|role-arn>',
      description: 'The credentials used by API Gateway to call the integration',
      type: 'list',
      choices: choicesLists.credentials,
      question: {
        message: 'What are the credentials (aka the AWS role) used by API Gateway to call the integration?',
        when(answers, cmdParameterValues) {
          if (cmdParameterValues.credentials) {
            return false;
          }
          return choicesLists.credentials().then(credentials => {
            return credentials.length > 0;
          });
        }
      }
    }, {
      type: 'input',
      question: {
        name: 'credentialsInput',
        message: 'Enter the credentials (aka the AWS role) used by API Gateway to call the integration',
        when(answers, cmdParameterValues) { return !answers.credentials && !cmdParameterValues.credentials; }
      }
    }],
    commanderActionHook() {
      // Uppercase the HTTP method
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

  /**
   * Build the choices for "list" and "checkbox" parameters
   * @returns {Object} - collection of lists of choices for "list" and "checkbox" parameters
   */
  function getChoices() {
    // First, retrieve possible values for the api-identifiers parameter
    const choicesLists = {
      httpMethod: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      mimeType: ['application/json', 'text/plain', { value: 'other', name: 'other (you will be prompted to enter a value)'}],
      auth: [
        { value: 'aws_iam', name: 'AWS authorization' },
        { value: 'none', name: 'None' }
      ]
    };

    choicesLists.apis = () => {
      return plugin.loadApis()
      .then(apis => {
        return _.map(apis, api => {
          return {
            value: api.getIdentifier(),
            name: icli.format.info(api.getIdentifier()) + (api.spec.info && api.spec.info.title ? ' - ' + api.spec.info.title : '')
          };
        });
      });
    };

    choicesLists.credentials = () => {
      return plugin.lager.call('iam:getRoles', [])
      .then(roles => {
        const credentials = [];
        _.forEach(roles, role => {
          if (_.find(role.config['trust-relationship'].Statement, (o) => { return o.Principal.Service === 'apigateway.amazonaws.com'; })) {
            credentials.push({
              value: role.getName(),
              name: icli.format.info(role.getName())
            });
          }
        });
        if (credentials.length > 0) {
          credentials.push({
            value: 'show-input-question',
            name: 'The AWS role is not managed by Lager, let me write the value'
          });
        }
        return credentials;
      });
    };

    choicesLists.lambdas = () => {
      return plugin.lager.call('node-lambda:getLambdas', [])
      .then(lambdas => {
        return _.map(lambdas, lambda => {
          // @TODO add possibilty to enter value manually
          return {
            value: lambda.getIdentifier(),
            name: icli.format.info(lambda.getIdentifier())
          };
        });
      });
    };

    return choicesLists;
  }

  /* istanbul ignore next */
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
    pathParts.unshift(path.join(process.cwd(), plugin.config.endpointsPath));
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
        responses: {
          '200': {}
        },
        'x-amazon-apigateway-auth': {
          type: parameters.auth
        },
        'x-amazon-apigateway-integration': {
          credentials: parameters.credentials,
          requestTemplates: _.transform(parameters.consume, (result, mimeType) => {
            result[mimeType] = null;
          }, {}),
          responses: {
            default: {
              statusCode: 200
            }
          }
        }
      };
      if (parameters.lambda) {
        spec['x-lager'].lambda = parameters.lambda;
      }

      // We save the specification in a json file
      const fileOperations = [
        fs.writeFileAsync(path.join(specFilePath, 'spec.json'), JSON.stringify(spec, null, 2))
      ];

      if (parameters.lambda) {
        fileOperations.push(
          ncpAsync(
            path.join(__dirname, 'templates', 'default-index.js'),
            path.join(specFilePath, 'index.js')
          )
        );
        fileOperations.push(
          ncpAsync(
            path.join(__dirname, 'templates', 'passthrough-template.vm'),
            path.join(specFilePath, 'integration.vm')
          )
        );
      }
      return Promise.all(fileOperations);
    })
    .then(() => {
      const msg = '\n  The endpoint ' + icli.format.info(parameters.httpMethod + ' ' + parameters.resourcePath) + ' has been created\n\n'
                + '  Its OpenAPI specification is available in ' + icli.format.info(specFilePath + path.sep + 'spec.json') + '\n'
                + '  You can inspect it using the command '
                + icli.format.cmd('lager inspect-endpoint ' + parameters.resourcePath + ' ' + parameters.httpMethod) + '\n';
      console.log(msg);
    });
  }

};
