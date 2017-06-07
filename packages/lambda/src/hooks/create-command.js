'use strict';

const _ = require('lodash');

const plugin = require('../index');
const loadIntegrationHook = require('./load-integration');

module.exports.hook = function createCommandHook(commandConfig, icli) {

  if (commandConfig.cmd === 'deploy-apis') {
    commandConfig.parameters.push({
      cmdSpec: '--deploy-lambdas [all|partial|none]',
      description: 'perform the deployment of Lambdas',
      type: 'list',
      choices: [
        {
          value: 'none',
          name: 'Do not deploy Lambdas'
        }, {
          value: 'partial',
          name: 'Only Lambdas that are associated to deployed endpoints'
        }, {
          value: 'all',
          name: 'All Lambdas of the project',
        }
      ],
      default: 'none',
      question: {
        message: 'Do you want to also deploy the Lambdas of the project?',
        when: (answers, cmdParameterValues) => {
          return cmdParameterValues['deployLambdas'] === undefined;
        }
      }
    });
    commandConfig.parameters.push({
      cmdSpec: '--alias <alias>',
      description: 'choose the alias of Lambdas',
      type: 'input',
      question: {
        message: 'What is the alias to use for Lambda integrations?',
        when: (answers, cmdParameterValues) => {
          return cmdParameterValues['alias'] === undefined && plugin.myrmex.getConfig('lambda.alias') === undefined;
        }
      }
    });
    const origExecute = commandConfig.execute;
    commandConfig.execute = parameters => {
      if (parameters.alias === undefined) { parameters.alias = plugin.myrmex.getConfig('lambda.alias'); }
      loadIntegrationHook.setDeployMode(parameters.deployLambdas);
      loadIntegrationHook.setAlias(parameters.alias);
      return origExecute(parameters);
    };
  }


  if (commandConfig.cmd === 'create-endpoint') {
    const choices = () => {
      return plugin.loadLambdas().then(lambdas => {
        return _.map(lambdas, lambda => {
          return {
            value: lambda.getIdentifier(),
            name: icli.format.info(lambda.getIdentifier())
          };
        });
      });
    };
    commandConfig.parameters.push({
      cmdSpec: '--lambda <lambda-identifier>',
      description: 'The Lambda to integrate with the endpoint',
      type: 'list',
      choices: choices,
      question: {
        message: 'What is the Lambda to integrate with the endpoint?',
        when(answers, cmdParameterValues) {
          if (cmdParameterValues.lambda || ['lambda', 'lambda-proxy'].indexOf(answers.integration) === -1) {
            return false;
          }
          return choices().then(lambdas => {
            return lambdas.length > 0;
          });
        }
      }
    });
    commandConfig.specModifiers.push((spec, parameters) => {
      if (parameters.lambda) {
        spec['x-myrmex'].lambda = parameters.lambda;
      }
    });
  }

};
