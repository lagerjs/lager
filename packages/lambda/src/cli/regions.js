'use strict'

module.exports = (icli) => {
  return [
    {
      value: 'us-east-1',
      name: icli.format.info('us-east-1') + '      US East (N. Virginia)',
      short: 'us-east-1 - US East (N. Virginia)'
    }, {
      value: 'us-east-2',
      name: icli.format.info('us-east-2') + '      US East (Ohio)',
      short: 'us-east-2 - US East (Ohio)'
    }, {
      value: 'us-west-1',
      name: icli.format.info('us-west-1') + '      US West (N. California)',
      short: 'us-west-1 - US West (N. California)'
    }, {
      value: 'us-west-2',
      name: icli.format.info('us-west-2') + '      US West (Oregon)',
      short: 'us-west-2 - US West (Oregon)'
    }, {
      value: 'ca-central-1',
      name: icli.format.info('ca-central-1') + '   Canada (Central)',
      short: 'ca-central-1 - Canada (Central)'
    }, {
      value: 'sa-east-1',
      name: icli.format.info('sa-east-1') + '      South America (São Paulo)',
      short: 'sa-east-1 - South America (São Paulo)'
    }, {
      value: 'eu-west-1',
      name: icli.format.info('eu-west-1') + '      EU (Ireland)',
      short: 'eu-west-1 - EU (Ireland)'
    }, {
      value: 'eu-west-2',
      name: icli.format.info('eu-west-2') + '      EU (London)',
      short: 'eu-west-2 - EU (London)'
    }, {
      value: 'eu-west-3',
      name: icli.format.info('eu-west-3') + '      EU (Paris)',
      short: 'eu-west-3 - EU (Paris)'
    }, {
      value: 'eu-central-1',
      name: icli.format.info('eu-central-1') + '   EU (Frankfurt)',
      short: 'eu-central-1 - EU (Frankfurt)'
    }, {
      value: 'ap-south-1',
      name: icli.format.info('ap-south-1') + '     Asia Pacific (Mumbai)',
      short: 'ap-south-1 - Asia Pacific (Mumbai)'
    }, {
      value: 'ap-northeast-1',
      name: icli.format.info('ap-northeast-1') + ' Asia Pacific (Tokyo)',
      short: 'ap-northeast-1 - Asia Pacific (Tokyo)'
    }, {
      value: 'ap-northeast-2',
      name: icli.format.info('ap-northeast-2') + ' Asia Pacific (Seoul)',
      short: 'ap-northeast-2 - Asia Pacific (Seoul)'
    }, {
      value: 'ap-northeast-3',
      name: icli.format.info('ap-northeast-3') + ' Asia Pacific (Osaka-Local)',
      short: 'ap-northeast-3 - Asia Pacific (Osaka-Local)'
    }, {
      value: 'ap-southeast-1',
      name: icli.format.info('ap-southeast-1') + ' Asia Pacific (Singapore)',
      short: 'ap-southeast-1 - Asia Pacific (Singapore)'
    }, {
      value: 'ap-southeast-2',
      name: icli.format.info('ap-southeast-2') + ' Asia Pacific (Sydney)',
      short: 'ap-southeast-2 - Asia Pacific (Sydney)'
    }
  ]
};
