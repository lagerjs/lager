/* eslint-env mocha */
'use strict';

if (process.env.NODE_ENV !== 'test') {
  const msg = '\x1b[0;33mTest cannot be executed if \x1b[0;31mNODE_ENV!==\'test\'\x1b[0;33m '
            + '(current value: \x1b[0;31m' + process.env.NODE_ENV + '\x1b[0;33m)\x1b[0m';
  console.log(msg);
  process.exit(1);
}

const path = require('path');
const Promise = require('bluebird');

// Creation of a wrapper to avoid ../../../.. in require() calls made in tests
global.testRequire = function(name) {
  return require(path.join(__dirname, '..', name));
};

Promise.config({
  longStackTraces: true
});

process.on('uncaughtException', (e) => {
  console.log('Unhandled Exception at: ', e);
});

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise ', p, ' reason: ', reason);
});

/**
 * Before executiong the tests
 * @return Promise
 */
before(function() {});


/**
 * Once the tests are finished
 * @return void
 */
after(function() {});
