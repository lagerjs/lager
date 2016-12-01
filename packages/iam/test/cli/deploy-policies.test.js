/*eslint-env mocha */
/* global testRequire */
'use strict';

const assert = require('assert');
const _ = require('lodash');
const cmd = testRequire('src/cli/deploy-policies');
const icli = require('comquirer');

describe('The deploy-policies sub-command', function() {

  it('is a function', () => {
    assert.equal(typeof cmd, 'function', 'the module "src/cli/deploy-policies" exposes a function');
  });

  it('creates a comquirer sub-command', () => {
    return cmd(icli).then(() => {
      assert.ok(
        _.find(icli.getProgram().commands, command => { return command._name === 'deploy-policies'; }),
        'a "deploy-policies sub command has been created"'
      );
    });
  });

  // To make this test work, icli.getProgram().parse() should return a Promise that resolve when the command finished its execution
  // it('execute the command "cmd"', (done) => {
  //   captureConsoleLog.begin();
  //   icli.getProgram().parse(['/node/path', '/program/path', 'cmd']);
  //   captureConsoleLog.end();
  // });

});
