'use strict';

const lager = require('@lager/lager/lib/lager');
const Promise = lager.getPromise();

function registerCommands(program, inquirer) {
  return Promise.all([
    require('@lager/lager/cli/new')(program, inquirer)
  ])
  .then(() => {
    return Promise.resolve([program, inquirer]);
  });
}


module.exports = {
  hooks: {
    registerCommands
  }
};
