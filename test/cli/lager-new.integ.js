/*eslint-env mocha */
'use strict';

const path = require('path');
const assert = require('assert');
const Promise = require('bluebird');
const fs = require('fs-extra');
const remove = Promise.promisify(fs.remove);
const icli = require('../../packages/cli/src/bin/lager');
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
    return icli.parse('node script.js new my-project @lager/iam'.split(' '))
    .then(res => {
      const stdout = icli.catchPrintStop();
      assert.ok(stdout.indexOf('Creating a node project') > -1);
      assert.ok(stdout.indexOf('Installing Lager and Lager plugins') > -1);
      assert.ok(stdout.indexOf('A new lager project has been created!') > -1);
      assert.ok(stdout.indexOf('You should now enter in the \x1b[36mmy-project\x1b[0m folder to start working') > -1);
      const lagerConfig = require('./my-project/lager');
      assert.equal(lagerConfig.plugins.length, 1);
      assert.equal(lagerConfig.plugins[0], '@lager/iam');
    });
  });

});
