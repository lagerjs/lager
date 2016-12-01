/*eslint-env mocha */
/* global testRequire */
'use strict';

const assert = require('assert');
const icli = require('comquirer');
const corePlugin = testRequire('src/lib/core-plugin');

describe('The lager core plugin', function() {

  it('should implement the register command hook', () => {
    assert.equal(typeof corePlugin.hooks.registerCommands, 'function', 'A "registerCommands" hook has been found');
  });

  it('should register new sub-commands', () => {
    const initialCount = icli.getProgram().commands.length;
    return corePlugin.hooks.registerCommands(icli)
    .then(() => {
      assert.ok(initialCount < icli.getProgram().commands.length, 'the command line has more sub-commands');
    });
  });

});
