'use strict';

const lager = require('./lager');
const Promise = lager.import.Promise;

function registerCommands() {
  return Promise.all([
    require('../cli/disable-default')(),
    require('../cli/new')(),
    require('../cli/please')()
  ])
  .then(() => {
    return Promise.resolve([]);
  });
}


module.exports = {
  name: 'core',

  hooks: {
    registerCommands
  }
};
