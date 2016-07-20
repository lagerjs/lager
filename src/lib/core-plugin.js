'use strict';

const Promise = require('bluebird');

function registerCommands(icli) {
  return Promise.all([
    require('../cli/please')(icli)
  ])
  .then(() => {
    return Promise.resolve([icli]);
  });
}


module.exports = {
  name: 'core',

  hooks: {
    registerCommands
  }
};
