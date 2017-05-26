/* eslint-env mocha */
/* global testRequire */
'use strict';

if (process.env.NODE_ENV !== 'test') {
  const msg = '\x1b[0;33mTest cannot be executed if \x1b[0;31mNODE_ENV!==\'test\'\x1b[0;33m '
            + '(current value: \x1b[0;31m' + process.env.NODE_ENV + '\x1b[0;33m)\x1b[0m';
  console.log(msg);
  process.exit(1);
}

// Creation of a wrapper to avoid ../../../.. in require() calls made in tests
global.testRequire = function(name) {
  return require(path.join(__dirname, '..', name));
};

const assert = require('assert');
const path = require('path');
const Promise = require('bluebird');
const _ = require('lodash');
const myrmex = require('../../core');
const nodeApiGatewayPlugin = testRequire('src/index');

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
 * Before executiong the tests, register the plugin in a myrmex instance
 * @return Promise
 */
before(function() {
  _.assign(nodeApiGatewayPlugin.config, {
    apisPath: 'test-assets' + path.sep + 'apis',
    endpointsPath: 'test-assets' + path.sep + 'endpoints',
    modelsPath: 'test-assets' + path.sep + 'models'
  });
  assert.equal(nodeApiGatewayPlugin.myrmex, undefined);
  myrmex.registerPlugin(nodeApiGatewayPlugin);
  assert.equal(nodeApiGatewayPlugin.myrmex, myrmex);
});


/**
 * Once the tests are finished
 * @return void
 */
after(function() {});
