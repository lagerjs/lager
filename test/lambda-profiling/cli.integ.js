/*eslint-env mocha */
'use strict';

const path = require('path');
const assert = require('assert');
const Promise = require('bluebird');
const fs = require('fs-extra');
const copy = Promise.promisify(fs.copy);
const remove = Promise.promisify(fs.remove);
const icli = require('../../packages/cli/src/bin/myrmex');
const showStdout = !!process.env.MYRMEX_SHOW_STDOUT;

describe('Creation and deployment of a Lambda project', () => {

  before(() => {
    process.chdir(__dirname);
  });

  beforeEach(() => {
    return icli.init();
  });

  after(() => {
    return Promise.all([
      remove(path.join(__dirname, 'lambda')),
      remove(path.join(__dirname, 'iam')),
      remove(path.join(__dirname, 'myrmex.log'))
    ]);
  });

  describe('Creation of an execution role', () => {
    it('should be done via the sub-command "create-role"', () => {
      icli.catchPrintStart(showStdout);
      return icli.parse('node script.js create-role LambdaInspection -m LambdaBasicExecutionRole'.split(' '))
      .then(res => {
        icli.catchPrintStop();
        assert.ok(true);
      });
    });
  });

  describe('Creation of a node module', () => {
    it('should be done via the sub-command "create-node-module"', () => {
      icli.catchPrintStart(showStdout);
      return icli.parse('node script.js create-node-module inspection'.split(' '))
      .then(res => {
        icli.catchPrintStop();
        // Create the main file of the module
        const src = path.join(__dirname, 'assets', 'inspection.js');
        const dest = path.join(__dirname, 'lambda', 'modules', 'inspection', 'index.js');
        return copy(src, dest);
      });
    });
  });

  describe('Creation of Lambdas', () => {
    it('should be done via the sub-command "create-lambda"', () => {
      icli.catchPrintStart(showStdout);
      return icli.parse('node script.js create-lambda config-128 -r nodejs6.10 -t 30 -m 128 --dependencies inspection --role LambdaInspection'.split(' '))
      .then(res => {
        return icli.parse('node script.js create-lambda config-512 -r nodejs6.10 -t 30 -m 512 --dependencies inspection --role LambdaInspection'.split(' '));
      })
      .then(res => {
        return icli.parse('node script.js create-lambda config-1536 -r nodejs6.10 -t 30 -m 1536 --dependencies inspection --role LambdaInspection'.split(' '));
      })
      .then(res => {
        icli.catchPrintStop();
        // Create the main file of the module
        const src = path.join(__dirname, 'assets', 'lambda.js');
        const dest128 = path.join(__dirname, 'lambda', 'lambdas', 'config-128', 'index.js');
        const dest512 = path.join(__dirname, 'lambda', 'lambdas', 'config-512', 'index.js');
        const dest1536 = path.join(__dirname, 'lambda', 'lambdas', 'config-1536', 'index.js');
        return Promise.all([
          copy(src, dest128),
          copy(src, dest512),
          copy(src, dest1536),
        ]);
      });
    });
  });

  describe('Local installation of Lambdas', () => {
    it('should be done via the sub-command "install-lambdas-locally"', () => {
      icli.catchPrintStart(showStdout);
      return icli.parse('node script.js install-lambdas-locally config-128'.split(' '))
      .then(res => {
        icli.catchPrintStop();
        assert.ok(true);
      });
    });
  });

  describe('Local execution of Lambdas', () => {
    it('should be done via the sub-command "test-lambda-locally"', () => {
      icli.catchPrintStart(showStdout);
      return icli.parse('node script.js test-lambda-locally config-128 --event test'.split(' '))
      .then(res => {
        icli.catchPrintStop();
        assert.ok(true);
      });
    });
  });


  describe('Deployment of Lambdas', () => {
    it('should be done via the sub-command "deploy-lambdas"', function() {
      icli.catchPrintStart(showStdout);
      this.timeout(30000);
      return icli.parse('node script.js deploy-lambdas config-128 config-512 config-1536 -r us-east-1 -e DEV -a v0'.split(' '))
      .then(res => {
        icli.catchPrintStop();
        assert.ok(true);
      });
    });

    it('should be done without needing to list all lambdas', function() {
      icli.catchPrintStart(showStdout);
      this.timeout(30000);
      return icli.parse('node script.js deploy-lambdas --all -r us-east-1 -e DEV -a v0'.split(' '))
      .then(res => {
        const stdout = icli.catchPrintStop();
        assert.ok(stdout.indexOf('Deploying \x1b[36m3\x1b[0m Lambda(s):') > -1);
        assert.ok(stdout.indexOf('DEV-config-128') > -1);
        assert.ok(stdout.indexOf('DEV-config-512') > -1);
        assert.ok(stdout.indexOf('DEV-config-1536') > -1);
        assert.ok(true);
      });
    });
  });

  describe('Execution of Lambdas in AWS', () => {
    it('should be done via the sub-command "test-lambda"', () => {
      icli.catchPrintStart(showStdout);
      return icli.parse('node script.js test-lambda config-128 -r us-east-1 -e DEV -a v0'.split(' '))
      .then(res => {
        return icli.parse('node script.js test-lambda config-128 -r us-east-1 -e DEV -a ""'.split(' '));
      })
      .then(res => {
        return icli.parse('node script.js test-lambda config-512 -r us-east-1 -e DEV -a v0'.split(' '));
      })
      .then(res => {
        return icli.parse('node script.js test-lambda config-1536 -r us-east-1 -e DEV -a v0'.split(' '));
      })
      .then(res => {
        icli.catchPrintStop();
        assert.ok(true);
      });
    });
  });

});
