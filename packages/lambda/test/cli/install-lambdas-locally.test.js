/*eslint-env mocha */
/* global testRequire */
'use strict';

const _ = require('lodash');
const assert = require('assert');
const cmd = testRequire('src/cli/install-lambdas-locally');
const icli = require('comquirer');

describe('The install-lambdas-locally sub-command', function() {

  it('is a function', () => {
    assert.equal(typeof cmd, 'function', 'the module "src/cli/install-lambdas-locally" exposes a function');
  });

  it('creates a comquirer sub-command', () => {
    cmd(icli);
    assert.ok(
      _.find(icli.getProgram().commands, command => { return command._name === 'install-lambdas-locally'; }),
      'a "install-lambdas-locally sub command has been created"'
    );
  });

});
