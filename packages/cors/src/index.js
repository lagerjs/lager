'use strict';

const plugin = {
  name: 'cors',
  version: require('../package.json').version,

  config: {
    'Access-Control-Allow-Methods': 'DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT,ANY',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Origin': '*'
  },

  hooks: {
    afterAddEndpointsToApi: require('./hooks/after-add-endpoints-to-api')()
  }
};

module.exports = plugin;
