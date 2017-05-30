/*eslint-env mocha */
'use strict';

const path = require('path');
const assert = require('assert');
const Promise = require('bluebird');
const fs = require('fs-extra');
const remove = Promise.promisify(fs.remove);
const icli = require('../../packages/cli/src/bin/myrmex');
const showStdout = !!process.env.MYRMEX_SHOW_STDOUT;

describe('Definition of IAM permissions', () => {

  before(() => {
    process.chdir(__dirname);
  });

  beforeEach(() => {
    return icli.init();
  });

  after(() => {
    return Promise.all([
      remove(path.join(__dirname, 'iam')),
      remove(path.join(__dirname, 'myrmex.log'))
    ]);
  });

  it('should allow to define policies', () => {
    icli.catchPrintStart(showStdout);
    return icli.parse('node script.js create-policy integration-test-policy'.split(' '))
    .then(res => {
      const stdout = icli.catchPrintStop();
      assert.ok(stdout.indexOf('The IAM policy \x1b[36mintegration-test-policy\x1b[0m has been created') > -1);
      const path = icli.myrmex.getConfig('iam.policiesPath');
      const policy = require('./' + path + '/integration-test-policy');
      assert.equal(policy.Statement[0].Effect, 'Deny');
    });
  });

  it('should allow to deploy policies', () => {
    icli.catchPrintStart(showStdout);
    return icli.parse('node script.js deploy-policies integration-test-policy -e TEST -s x'.split(' '))
    .then(res => {
      const stdout = icli.catchPrintStop();
      assert.ok(stdout.indexOf('Policies deployed') > -1);
      assert.ok(stdout.indexOf('TEST_integration-test-policy_x') > -1);
    });
  });

  it('should allow to define roles', () => {
    icli.catchPrintStart(showStdout);
    return icli.parse('node script.js create-role integration-test-role -m none -p integration-test-policy'.split(' '))
    .then(res => {
      const stdout = icli.catchPrintStop();
      assert.ok(stdout.indexOf('The IAM role \x1b[36mintegration-test-role\x1b[0m has been created') > -1);
      const path = icli.myrmex.getConfig('iam.rolesPath');
      const role = require('./' + path + '/integration-test-role');
      assert.equal(role['managed-policies'][0], 'integration-test-policy');
    });
  });

  it('should allow to deploy roles', () => {
    icli.catchPrintStart(showStdout);
    return icli.parse('node script.js deploy-roles integration-test-role -e TEST -s x'.split(' '))
    .then(res => {
      const stdout = icli.catchPrintStop();
      assert.ok(stdout.indexOf('Roles deployed') > -1);
      assert.ok(stdout.indexOf('TEST_integration-test-role_x') > -1);
    });
  });

});
