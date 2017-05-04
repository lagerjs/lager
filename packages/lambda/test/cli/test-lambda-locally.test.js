/*eslint-env mocha */
/* global testRequire */
'use strict';

const _ = require('lodash');
const assert = require('assert');
const cmd = testRequire('src/cli/test-lambda-locally');
const icli = require('comquirer');

describe('The test-lambda-locally sub-command', function() {

  it('is a function', () => {
    assert.equal(typeof cmd, 'function', 'the module "src/cli/test-lambda-locally" exposes a function');
  });

  it('creates a comquirer sub-command', () => {
    cmd(icli);
    assert.ok(
      _.find(icli.getProgram().commands, command => { return command._name === 'test-lambda-locally'; }),
      'a "test-lambda-locally sub command has been created"'
    );
  });

});
