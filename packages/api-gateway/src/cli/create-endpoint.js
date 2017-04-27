'use strict';

const Promise = require('bluebird');
const _ = require('lodash');

const path = require('path');
const fs = Promise.promisifyAll(require('fs'));
const mkdirpAsync = Promise.promisify(require('mkdirp'));

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
      cmdSpec: '--auth <authentication-type>',
      description: 'The type of authentication used to call the endpoint (aws_iam|none)',
      type: 'list',
      choices: choicesLists.auth,
      question: {
        message: 'What is the authentication type used to access to this endpoint?'
      }
    }, {
      cmdSpec: '-i --integration <integration-type>',
      description: 'The type of integration (lambda|http|mock|aws-service)',
      type: 'list',
      choices: choicesLists.integration,
      question: {
        message: 'What is the type of integration of this endpoint?'
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
      type: 'list',
      choices: choicesLists.roleOrigins,
      question: {
        name: 'roleOrigin',
        message: 'Where can we find the role that will invoke the integration?',
        when: (answers, cmdParameterValues) => {
          if (cmdParameterValues.role) { return false; }
          return choicesLists.roleOrigins().length > 0;
        }
      }
    }, {
      cmdSpec: '-r, --role <role>',
      description: 'select the role to invoke integration' + (plugin.lager.isPluginRegistered('iam') ? '' : ' (enter the ARN)'),
      type: 'list',
      choices: choicesLists.roles,
      // We desactivate validation because the value can be set manually
      validate: input => { return true; },
      question: {
        message: 'Choose the invocation role',
        when(answers, cmdParameterValues) {
          if (cmdParameterValues.role) { return false; }
          return answers.roleOrigin === 'lager' || answers.roleOrigin === 'aws';
        }
      }
    }, {
      type: 'input',
      question: {
        name: 'roleManually',
        message: 'Enter the IAM role that will be used to invoke the integration' + (plugin.lager.isPluginRegistered('iam') ? '' : ' (enter the ARN)'),
        when(answers, cmdParameterValues) {
          return !answers.role && !cmdParameterValues.role;
        }
      }
    }],
    commanderActionHook() {
      // Uppercase the HTTP method
      if (arguments[1]) { arguments[1] = arguments[1].toUpperCase(); }
      return arguments;
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
    return {
      httpMethod: plugin.httpMethods,
      auth: [
        { value: 'aws_iam', name: 'AWS authorization' },
        { value: 'none', name: 'None' }
      ],
      integration: [
        { value: 'lambda', name: 'Lambda function' },
        { value: 'lambda-proxy', name: 'Lambda function with proxy integration' },
        { value: 'http', name: 'Existing HTTP endpoint' },
        { value: 'mock', name: 'Mock' },
        { value: 'aws-service', name: 'AWS service' }
      ],
      apis: () => {
        return plugin.loadApis()
        .then(apis => {
          return _.map(apis, api => {
            return {
              value: api.getIdentifier(),
              name: icli.format.info(api.getIdentifier()) + (api.spec.info && api.spec.info.title ? ' - ' + api.spec.info.title : '')
            };
          });
        });
      },
      roleOrigins: () => {
        if (plugin.lager.isPluginRegistered('iam')) {
          const choices = [];
          choices.push({
            value: 'lager',
            name: 'Select a role managed by the plugin @lager/iam'
          });
          choices.push({
            value: 'aws',
            name: 'Select a role in your AWS account'
          });
          choices.push({
            value: '',
            name: 'Enter the value manually'
          });
          return choices;
        }
        return [];
      },
      roles: (answers) => {
        if (answers && answers.roleOrigin === 'aws') {
          return plugin.lager.call('iam:getAWSRoles', [])
          .then(roles => {
            return _.map(roles, 'RoleName');
          });
        } else {
          return plugin.lager.call('iam:getRoles', [])
          .then(roles => {
            const eligibleRoles = [];
            _.forEach(roles, role => {
              if (_.find(role.config['trust-relationship'].Statement, (o) => { return o.Principal.Service === 'apigateway.amazonaws.com'; })) {
                eligibleRoles.push({
                  value: role.getName(),
                  name: icli.format.info(role.getName())
                });
              }
            });
            return eligibleRoles;
          });
        }
      },
      lambdas: () => {
        return plugin.lager.call('node-lambda:getLambdas', [])
        .then(lambdas => {
          return _.map(lambdas, lambda => {
            return {
              value: lambda.getIdentifier(),
              name: icli.format.info(lambda.getIdentifier())
            };
          });
        });
      }
    };
  }

  /**
   * Create the new endpoint
   * @param {Object} parameters - the parameters provided in the command and in the prompt
   * @returns {Promise<null>} - The execution stops here
   */
  function executeCommand(parameters) {
    if (!parameters.role && parameters.roleManually) { parameters.role = parameters.roleManually; }
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
      // We create the endpoint Swagger/OpenAPI specification
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
          credentials: parameters.role,
          responses: {
            default: {
              statusCode: 200
            }
          }
        }
      };
      if (parameters.integration === 'lambda-proxy') {
        spec['x-amazon-apigateway-integration'].type = 'aws_proxy';
        spec['x-amazon-apigateway-integration'].contentHandling = 'CONVERT_TO_TEXT';
        spec['x-amazon-apigateway-integration'].passthroughBehavior = 'when_no_match';
        spec['x-amazon-apigateway-integration'].httpMethod = 'POST';
      }
      if (parameters.lambda) {
        spec['x-lager'].lambda = parameters.lambda;
      }

      // We save the specification in a json file
      return fs.writeFileAsync(path.join(specFilePath, 'spec.json'), JSON.stringify(spec, null, 2));
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
