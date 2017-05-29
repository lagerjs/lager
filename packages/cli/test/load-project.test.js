/*eslint-env mocha */
/* global testRequire */
'use strict';

const path = require('path');
const Promise = require('bluebird');
const exec = Promise.promisify(require('child_process').exec, { multiArgs: true });
const assert = require('assert');
const icli = require('comquirer');
const loadProject = testRequire('src/load-project');

describe('The load-project module', function() {

  it('should work even if no myrmex project is found', () => {
    return loadProject(icli)
    .then(result => {
      assert.equal(result, null);
    });
  });

  it('should throw a error if a myrmex project is found but @myrmex/core is not installed', () => {
    const oldCwd = process.cwd();
    process.chdir(path.join(__dirname, '..', 'test-assets'));
    return loadProject(icli)
    .then(result => {
      process.chdir(oldCwd);
      throw new Error('loadProject() should have thrown an exception but did not');
    })
    .catch(e => {
      process.chdir(oldCwd);
      assert.equal(e.message, 'Myrmex seems to be present in a package.json file but not installed. Maybe you have to use `npm install`.');
    });
  });

  it('should load a myrmex instance when the command is launched from a Myrmex project', function() {
    this.timeout(20000);
    const oldCwd = process.cwd();
    const projectPath = path.join(__dirname, '..', 'test-assets');
    process.chdir(projectPath);
    return exec('npm install', { cwd: projectPath })
    .then(() => {
      return loadProject(icli);
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

  it('should load a myrmex instance when the command is launched from a subdirectory of a Myrmex project', function() {
    this.timeout(20000);
    const oldCwd = process.cwd();
    const projectPath = path.join(__dirname, '..', 'test-assets');
    process.chdir(path.join(projectPath, 'plugins'));
    return exec('npm install', { cwd: projectPath })
    .then(() => {
      return loadProject(icli);
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
