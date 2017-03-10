'use strict';

module.exports.hook = function createCommandHook(commandConfig) {
  if (commandConfig.cmd === 'deploy-apis') {
    commandConfig.parameters.push({
      cmdSpec: '--deploy-roles [all|integration|none]',
      description: 'perform the deployment of IAM roles',
      type: 'list',
      choices: [{
        value: 'none',
        name: 'Do not deploy IAM roles'
      }, {
        value: 'partial',
        name: 'Only IAM roles that are associated to deployed endpoints'
      }, {
        value: 'all',
        name: 'All IAM roles of the project',
      }],
      default: 'none',
      question: {
        message: 'Do you want to also deploy the IAM roles of the project?',
        when: (answers, cmdParameterValues) => {
          return cmdParameterValues['deployRoles'] === undefined;
        }
      }
    });
    const origExecute = commandConfig.execute;
    commandConfig.execute = parameters => {
      const plugin = require('../index');
      return origExecute(parameters);
    };
  }
};
