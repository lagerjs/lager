'use strict';

const path = require('path');
const fs = require('fs-extra');
const Promise = require('bluebird');
const exec = Promise.promisify(require('child_process').exec, { multiArgs: true });
const nodejsContextMock = require('./nodejs-context-mock');

/**
 * Returns the result of a local execution
 * @returns {Object}
 */
module.exports.executeLocally = function executeLocally(lambda, event, contextMock) {
  const handlerParts = lambda.config.params.Handler.split('.');
  const lambdaModule = require(path.join(lambda.getFsPath(), handlerParts[0]));
  contextMock = contextMock || nodejsContextMock;

  // Used to save the value returned by the handler
  let handlerReturn;

  // Transform context.succeed() / context.fail() as a Promise
  const contextPromise = new Promise((resolve, reject) => {
    const succeed = contextMock.succeed;
    const fail = contextMock.fail;
    contextMock.fail = (res) => {
      fail(res);
      resolve({ failure: res });
    };
    contextMock.succeed = (res) => {
      succeed(res);
      resolve({ success: res });
    };
  });

  // Transform callback as a Promise
  const callbackPromise = new Promise((resolve, reject) => {
    handlerReturn = lambdaModule[handlerParts[1]](event, contextMock, (err, res) => {
      if (err) {
        resolve({ failure: err });
      } else {
        resolve({ success: res });
      }
    });
  });

  // If the handler returns a Promise, its resolution is considered as the result of the lambda execution
  if (handlerReturn && typeof handlerReturn.then === 'function') {
    return handlerReturn.then(res => {
      return Promise.resolve({
        response: res
      });
    });
  }
  // If the handler does not return a Promise
  // The first method (context or callback or return) that resolves or rejects
  // will be considered as the result of the lambda execution
  return Promise.race([callbackPromise, contextPromise])
  .then(res => {
    return Promise.resolve({ response: res });
  })
  .catch(e => {
    return Promise.reject(e);
  });
};

/**
 * Install the lambda dependencies
 * @returns {Promise<Lambda>}
 */
module.exports.installLocally = function install(lambda) {
  const fsPath = lambda.getFsPath();
  return fs.remove(path.join(fsPath, 'node_modules'))
  .then(() => {
    return exec('npm install --loglevel=error', { cwd: fsPath });
  });
};
