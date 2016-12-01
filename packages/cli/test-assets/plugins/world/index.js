'use strict';

const plugin = {
  name: 'world',
  hooks: {
    registerCommands: (icli) => {
      plugin.lager.log.info('"world" registerCommands hook called');
    }
  }
};

module.exports = plugin;
