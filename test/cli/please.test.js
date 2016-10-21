/*eslint-env mocha */
/* global testRequire */
'use strict';

const assert = require('assert');
const _ = require('lodash');
const icli = require('comquirer');
const cmd = testRequire('src/cli/please');

describe('The please sub-command', function() {

  it('is a function', () => {
    assert.equal(typeof cmd, 'function', 'the module "src/cli/please" exposes a function');
  });

  it('creates a comquirer sub-command', () => {
    return cmd(icli).then(() => {
      assert.ok(
        _.find(icli.getProgram().commands, command => { return command._name === 'please'; }),
        'a "create-api sub command has been created"'
      );
    });
  });

  // To make this test work, icli.getProgram().parse() should return a Promise that resolve when the command finished its execution
  // it('execute the command "please"', (done) => {
  //   captureConsoleLog.begin();
  //   icli.getProgram().parse(['/node/path', '/program/path', 'please']);
  //   captureConsoleLog.end();
  // });

});
