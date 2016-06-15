'use strict';

const lager = require('@lager/lager/lib/lager');

module.exports = function(program, inquirer) {
  return program
  .command('deploy-apis')
  .description('deploy apis')
  .option('-r, --region [region]', 'select the AWS region', process.env.AWS_DEFAULT_REGION || 'us-east-1')
  .option('-s, --stage [stage]', 'select the API stage', process.env.API_GATEWAY_STAGE || 'v0')
  .option('-e, --environment [environment]', 'select the environment', process.env.NODE_ENV || 'NO_ENV')
  .action(options => {
    lager.getPlugin('api-gateway').deploy(
      options.region,
      options.stage,
      options.environment
    );
  });
};
