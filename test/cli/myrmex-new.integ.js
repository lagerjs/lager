/*eslint-env mocha */
'use strict';

const path = require('path');
const assert = require('assert');
const Promise = require('bluebird');
const fs = require('fs-extra');
const remove = Promise.promisify(fs.remove);
const icli = require('../../packages/cli/src/bin/myrmex');
const showStdout = !!process.env.LAGER_SHOW_STDOUT;

describe('Creation of a new project', () => {

  before(() => {
    process.chdir(__dirname);
  });

  beforeEach(() => {
    return icli.init();
  });

  after(() => {
    return remove(path.join(__dirname, 'my-project'));
  });

  it('should be done via the sub-command "new"', function() {
    this.timeout(120000);
    icli.catchPrintStart(showStdout);
    return icli.parse('node script.js new my-project @myrmex/iam'.split(' '))
    .then(res => {
      const stdout = icli.catchPrintStop();
      assert.ok(stdout.indexOf('Creating a node project') > -1);
      assert.ok(stdout.indexOf('Installing Myrmex and Myrmex plugins') > -1);
      assert.ok(stdout.indexOf('A new myrmex project has been created!') > -1);
      assert.ok(stdout.indexOf('You should now enter in the \x1b[36mmy-project\x1b[0m folder to start working') > -1);
      const myrmexConfig = require('./my-project/myrmex');
      assert.equal(myrmexConfig.plugins.length, 1);
      assert.equal(myrmexConfig.plugins[0], '@myrmex/iam');
    });
  });

});
