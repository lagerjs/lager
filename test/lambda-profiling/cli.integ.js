/*eslint-env mocha */
'use strict';

const path = require('path');
const assert = require('assert');
const Promise = require('bluebird');
const fs = require('fs-extra');
const copy = Promise.promisify(fs.copy);
const remove = Promise.promisify(fs.remove);
const catchStdout = require('../catch-stdout');
const icli = require('../../packages/cli/src/bin/lager');
const showStdout = !!process.env.LAGER_SHOW_STDOUT;

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
      remove(path.join(__dirname, 'lager.log'))
    ]);
  });

  describe('Creation of an execution role', () => {
    it('should be done via the sub-command "create-role"', () => {
      catchStdout.start(showStdout);
      return icli.parse('node script.js create-role LambdaInspection -m LambdaBasicExecutionRole'.split(' '))
      .then(res => {
        catchStdout.stop();
        assert.ok(true);
      });
    });
  });

  describe('Creation of a node module', () => {
    it('should be done via the sub-command "create-node-module"', () => {
      catchStdout.start(showStdout);
      return icli.parse('node script.js create-node-module inspection'.split(' '))
      .then(res => {
        catchStdout.stop();
        // Create the main file of the module
        const src = path.join(__dirname, 'assets', 'inspection.js');
        const dest = path.join(__dirname, 'lambda', 'modules', 'inspection', 'index.js');
        return copy(src, dest);
      });
    });
  });

  describe('Creation of Lambdas', () => {
    it('should be done via the sub-command "create-lambda"', () => {
      catchStdout.start(showStdout);
      return icli.parse('node script.js create-lambda config-128 -r nodejs6.10 -t 30 -m 128 --dependencies inspection -r LambdaInspection'.split(' '))
      .then(res => {
        return icli.parse('node script.js create-lambda config-512 -r nodejs6.10 -t 30 -m 512 --dependencies inspection -r LambdaInspection'.split(' '));
      })
      .then(res => {
        return icli.parse('node script.js create-lambda config-1536 -r nodejs6.10 -t 30 -m 1536 --dependencies inspection -r LambdaInspection'.split(' '));
      })
      .then(res => {
        catchStdout.stop();
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
      catchStdout.start(showStdout);
      return icli.parse('node script.js install-lambdas-locally config-128'.split(' '))
      .then(res => {
        catchStdout.stop();
        assert.ok(true);
      });
    });
  });

  describe('Local execution of Lambdas', () => {
    it('should be done via the sub-command "test-lambda-locally"', () => {
      catchStdout.start(showStdout);
      return icli.parse('node script.js test-lambda-locally config-128 --event test'.split(' '))
      .then(res => {
        catchStdout.stop();
        assert.ok(true);
      });
    });
  });


  describe('Deployment of Lambdas', () => {
    it('should be done via the sub-command "deploy-lambdas"', function() {
      catchStdout.start(showStdout);
      this.timeout(30000);
      return icli.parse('node script.js deploy-lambdas config-128 config-512 config-1536 -r us-east-1 -e DEV -s v0'.split(' '))
      .then(res => {
        catchStdout.stop();
        assert.ok(true);
      });
    });
  });


  describe('Execution of Lambdas in AWS', () => {
    it('should be done via the sub-command "test-lambda"', () => {
      catchStdout.start(showStdout);
      return icli.parse('node script.js test-lambda config-128 -r us-east-1 -e DEV -s v0'.split(' '))
      .then(res => {
        return icli.parse('node script.js test-lambda config-512 -r us-east-1 -e DEV -s v0'.split(' '));
      })
      .then(res => {
        return icli.parse('node script.js test-lambda config-1536 -r us-east-1 -e DEV -s v0'.split(' '));
      })
      .then(res => {
        catchStdout.stop();
        assert.ok(true);
      });
    });
  });

});
