/*eslint-env mocha */
/* global testRequire */
'use strict';

const path = require('path');
const assert = require('assert');
const icli = require('comquirer');
const loadLagerProject = testRequire('src/load-lager-project');

describe('The load-lager-project module', function() {

  it('should work even if no lager project is found', () => {
    return loadLagerProject(icli)
    .then(result => {
      assert.equal(result, true);
    });
  });

  it('should throw a error if a lager project is found but @lager/lager is not installed', () => {
    const oldCwd = process.cwd();
    process.chdir(path.join(__dirname, '..', 'test-assets'));
    return loadLagerProject(icli)
    .then(result => {
      process.chdir(oldCwd);
      throw new Error('loadLagerProject() should have thrown an exception but did not');
    })
    .catch(e => {
      process.chdir(oldCwd);
      assert.equal(e.message, 'Lager seems to be present in a package.json file but not installed. Maybe you have to use `npm install`.');
    });
  });

  it.skip('should load a lager instance when the command is launched from a Lager project', () => {
    const oldCwd = process.cwd();
    process.chdir(path.join(__dirname, '..', 'test-assets'));
    return loadLagerProject(icli)
    .then(result => {
      process.chdir(oldCwd);
      try {
        assert.equal(typeof result, 'Lager');
      } catch (e) {
        throw e;
      }
    });
  });

  it.skip('should load a lager instance when the command is launched from a subdirectory of a Lager project', () => {
    return loadLagerProject(icli)
    .then(result => {
      assert.equal(result, true);
    });
  });

});
