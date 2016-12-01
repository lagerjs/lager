'use strict';

const plugin = {
  name: 'hello',
  hooks: {
    registerCommands: (icli) => {
      plugin.lager.log.info('"hello" registerCommands hook called');
    }
  }
};

module.exports = plugin;
