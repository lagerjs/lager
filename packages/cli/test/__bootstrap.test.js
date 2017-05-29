/* eslint-env mocha */
'use strict';

if (process.env.NODE_ENV !== 'test') {
  const msg = '\x1b[0;33mTest cannot be executed if \x1b[0;31mNODE_ENV!==\'test\'\x1b[0;33m '
            + '(current value: \x1b[0;31m' + process.env.NODE_ENV + '\x1b[0;33m)\x1b[0m';
  console.log(msg);
  process.exit(1);
}

const path = require('path');

// Creation of a wrapper to avoid ../../../.. in require() calls made in tests
global.testRequire = function(name) {
  return require(path.join(__dirname, '..', name));
};

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
