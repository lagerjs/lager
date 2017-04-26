'use strict';

const plugin = {
  name: 'cors',

  config: {},

  hooks: {}
};

plugin.hooks.afterAddEndpointsToApi = require('./hooks/after-add-endpoints-to-api')(plugin);

module.exports = plugin;
