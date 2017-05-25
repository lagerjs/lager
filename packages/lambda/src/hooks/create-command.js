'use strict';

const loadIntegrationHook = require('./load-integration');

module.exports.hook = function createCommandHook(commandConfig) {
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
          return cmdParameterValues['alias'] === undefined;
        }
      }
    });
    const origExecute = commandConfig.execute;
    commandConfig.execute = parameters => {
      loadIntegrationHook.setDeployMode(parameters.deployLambdas);
      loadIntegrationHook.setAlias(parameters.alias);
      return origExecute(parameters);
    };
  }
};
