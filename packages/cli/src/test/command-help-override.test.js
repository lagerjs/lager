/*eslint-env mocha */
/* global testRequire */
'use strict';

const assert = require('assert');
const icli = require('comquirer');
const commandHelpOverride = testRequire('src/commander-help-override');

describe('The command help override', function() {

  it('should organize sub-commands in sections', () => {
    icli.getProgram().commandHelp = commandHelpOverride;
    assert.ok(/CLI core:/.test(icli.getProgram().helpInformation()));
  });

});
