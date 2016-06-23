/*eslint-env mocha */
'use strict';

const assert = require('assert');
const icli = require.main.require('src/lib/icli');

describe('The interactive command line', function() {

  it('should colorize portions of text', () => {
    assert.equal(icli.format.cmd('a command'), '\x1b[33ma command\x1b[0m', 'commands are colorised');
    assert.equal(icli.format.info('an info'), '\x1b[36man info\x1b[0m', 'information is colorised');
    assert.equal(icli.format.error('an error'), '\x1b[31man error\x1b[0m', 'errors are colorised');
    assert.equal(icli.format.success('a success message'), '\x1b[32ma success message\x1b[0m', 'success messages are colorised');
    assert.equal(icli.format.custom('a custom message', '\x1b[35m'), '\x1b[35ma custom message\x1b[0m', 'it is possible to customize text format');
    assert.equal(icli.format.ok('ok'), '\x1b[32mok\x1b[0m', '"ok" messages are colorised');
    assert.equal(icli.format.ko('ko'), '\x1b[31mko\x1b[0m', '"ko" messages are colorised');
  });

  it('should transform a configuration object into a command and a prompt', () => {
    const config = {
      cmd: 'my-command',
      description: 'A test command',
      parameters: [{
        cmdSpec: '[cmd-argument]',
        type: 'input',
        question: {
          message: 'The question correponding to the command argument'
        }
      }, {
        cmdSpec: '-o, --option <option-values>',
        description: 'a command option',
        type: 'checkbox',
        choices: ['a', 'b', 'c'],
        question: {
          message: 'This question propose to choose between 3 propositions'
        }
      }]
    };
    icli.createSubCommand(config, parameters => {});
  });

});
