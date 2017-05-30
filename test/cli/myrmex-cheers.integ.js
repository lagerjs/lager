/*eslint-env mocha */
'use strict';

const assert = require('assert');
const icli = require('../../packages/cli/src/bin/myrmex');
const showStdout = !!process.env.MYRMEX_SHOW_STDOUT;

describe('The "cheers" sub-command', () => {

  before(() => {
    process.chdir(__dirname);
  });

  beforeEach(() => {
    return icli.init();
  });

  it('should display a beer', () => {
    icli.catchPrintStart(showStdout);
    return icli.parse('node script.js cheers'.split(' '))
    .then(res => {
      const stdout = icli.catchPrintStop();
      assert.ok(stdout.indexOf('language: ') > -1);
      assert.ok(stdout.indexOf('font: ') > -1);
    });
  });

  it('should allow to select a language and a font', () => {
    icli.catchPrintStart(showStdout);
    return icli.parse('node script.js cheers -l french -f Binary'.split(' '))
    .then(res => {
      const stdout = icli.catchPrintStop();
      assert.ok(stdout.indexOf('language: french') > -1);
      assert.ok(stdout.indexOf('font: Binary') > -1);
      assert.ok(stdout.indexOf('01010011 01100001 01101110 01110100 01100101') > -1);
    });
  });
});
