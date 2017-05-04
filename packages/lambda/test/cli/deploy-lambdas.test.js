/*eslint-env mocha */
/* global testRequire */
'use strict';

const _ = require('lodash');
const assert = require('assert');
const cmd = testRequire('src/cli/deploy-lambdas');
const icli = require('comquirer');

describe('The deploy-lambdas sub-command', function() {

  it('is a function', () => {
    assert.equal(typeof cmd, 'function', 'the module "src/cli/deploy-lambdas" exposes a function');
  });

  it('creates a comquirer sub-command', () => {
    cmd(icli);
    assert.ok(
      _.find(icli.getProgram().commands, command => { return command._name === 'deploy-lambdas'; }),
      'a "deploy-lambdas sub command has been created"'
    );
  });

});
