'use strict';

const path = require('path');
const Promise = require('bluebird');
const rimraf = Promise.promisify(require('rimraf'));
const exec = Promise.promisify(require('child_process').exec, { multiArgs: true });

/**
 * Returns the result of a local execution
 * @returns {Object}
 */
module.exports.executeLocally = function executeLocally(lambda, event) {
  const handlerParts = lambda.config.params.Handler.split('.');
  const m = require(path.join(lambda.getFsPath(), handlerParts[0]));
  return Promise.promisify(m[handlerParts[1]])(event, {});
};

/**
 * Install the lambda dependencies
 * @returns {Promise<Lambda>}
 */
module.exports.installLocally = function install(lambda) {
  const fsPath = lambda.getFsPath();
  return rimraf(path.join(fsPath, 'node_modules'))
  .then(() => {
    return exec('npm install --loglevel=error', { cwd: fsPath });
  });
};
