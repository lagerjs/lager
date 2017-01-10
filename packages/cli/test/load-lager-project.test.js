/*eslint-env mocha */
/* global testRequire */
'use strict';

const path = require('path');
const Promise = require('bluebird');
const exec = Promise.promisify(require('child_process').exec, { multiArgs: true });
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

  it('should load a lager instance when the command is launched from a Lager project', function() {
    this.timeout(20000);
    const oldCwd = process.cwd();
    const projectPath = path.join(__dirname, '..', 'test-assets');
    process.chdir(projectPath);
    return exec('npm install', { cwd: projectPath })
    .then(() => {
      return loadLagerProject(icli);
    })
    .then(result => {
      return Promise.all([
        result,
        exec('rm -r ' + path.join(projectPath, 'node_modules'))
      ]);
    })
    .spread(result => {
      process.chdir(oldCwd);
      assert.ok(result.log);
      assert.ok(result.config);
      assert.ok(result.plugins);
    });
  });

  it('should load a lager instance when the command is launched from a subdirectory of a Lager project', function() {
    this.timeout(20000);
    const oldCwd = process.cwd();
    const projectPath = path.join(__dirname, '..', 'test-assets');
    process.chdir(path.join(projectPath, 'plugins'));
    return exec('npm install', { cwd: projectPath })
    .then(() => {
      return loadLagerProject(icli);
    })
    .then(result => {
      return Promise.all([
        result,
        exec('rm -r ' + path.join(projectPath, 'node_modules'))
      ]);
    })
    .spread(result => {
      process.chdir(oldCwd);
      assert.ok(result.log);
      assert.ok(result.config);
      assert.ok(result.plugins);
    });
  });

});
