/*eslint-env mocha */
/* global testRequire */
'use strict';

const assert = require('assert');
const _ = require('lodash');
const icli = require('comquirer');
const cmd = testRequire('src/cli/disable-default');

describe('The disable-default module', function() {

  it('is a function', () => {
    assert.equal(typeof cmd, 'function', 'the module "src/cli/disable-default" exposes a function');
  });

  it('creates a comquirer sub-command', () => {
    cmd(icli);
    assert(
      _.find(icli.getProgram().commands, command => { return command._name === '*'; }),
      'a "*" sub command has been created'
    );
  });

});
