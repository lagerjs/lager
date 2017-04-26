'use strict';

module.exports = {
  name: 'cors',

  config: {},

  hooks: {
    afterApiLoad: require('hooks/after-api-load')
  }
};
