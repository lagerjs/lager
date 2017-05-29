/*eslint-env mocha */
/* global testRequire */
'use strict';

const assert = require('assert');
const _ = require('lodash');
const icli = require('comquirer');
const cmd = testRequire('src/cli/new');

describe('The new sub-command', function() {

  it('is a function', () => {
    assert.equal(typeof cmd, 'function', 'the module "src/cli/new" exposes a function');
  });

  it('creates a comquirer sub-command', () => {
    cmd(icli);
    assert(
      _.find(icli.getProgram().commands, command => { return command._name === 'new'; }),
      'a "new" sub command has been created'
    );
  });

});
