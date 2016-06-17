'use strict';

const lager = require('@lager/lager/lib/lager');
const Promise = lager.getPromise();

function registerCommands() {
  return Promise.all([
    require('@lager/lager/cli/disable-default')(),
    require('@lager/lager/cli/new')()
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
