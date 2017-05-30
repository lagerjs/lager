/*eslint-env mocha */
/* global testRequire */
'use strict';

const assert = require('assert');
const _ = require('lodash');
const cmd = testRequire('src/cli/deploy-apis');
const icli = require('comquirer');

describe('The deploy-apis sub-command', function() {

  it('is a function', () => {
    assert.equal(typeof cmd, 'function', 'the module "src/cli/deploy-apis" exposes a function');
  });

  it('creates a comquirer sub-command', () => {
    cmd(icli);
    assert.ok(
      _.find(icli.getProgram().commands, command => { return command._name === 'deploy-apis'; }),
      'a "deploy-apis sub command has been created"'
    );
  });

});
