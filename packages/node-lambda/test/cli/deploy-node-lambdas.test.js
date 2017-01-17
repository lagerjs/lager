/*eslint-env mocha */
/* global testRequire */
'use strict';

const _ = require('lodash');
const assert = require('assert');
const cmd = testRequire('src/cli/deploy-node-lambdas');
const icli = require('comquirer');

describe('The deploy-node-lambdas sub-command', function() {

  it('is a function', () => {
    assert.equal(typeof cmd, 'function', 'the module "src/cli/deploy-node-lambdas" exposes a function');
  });

  it('creates a comquirer sub-command', () => {
    cmd(icli);
    assert.ok(
      _.find(icli.getProgram().commands, command => { return command._name === 'deploy-node-lambdas'; }),
      'a "deploy-node-lambdas sub command has been created"'
    );
  });

  // To make this test work, icli.getProgram().parse() should return a Promise that resolve when the command finished its execution
  // it('execute the command "cmd"', (done) => {
  //   captureConsoleLog.begin();
  //   icli.getProgram().parse(['/node/path', '/program/path', 'cmd']);
  //   captureConsoleLog.end();
  // });

});
