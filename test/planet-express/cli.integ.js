/*eslint-env mocha */
'use strict';

const path = require('path');
const assert = require('assert');
const Promise = require('bluebird');
const fs = require('fs-extra');
const remove = Promise.promisify(fs.remove);
const icli = require('../../packages/cli/src/bin/lager');

describe('Creation and deployment of the Planet Express project', () => {

  before(() => {
    process.chdir(__dirname);
  });

  beforeEach(() => {
    return icli.init();
  });

  after(() => {
    return Promise.all([
      remove(path.join(__dirname, 'api-gateway')),
      remove(path.join(__dirname, 'node-lambda')),
      remove(path.join(__dirname, 'iam')),
      remove(path.join(__dirname, 'lager.log'))
    ]);
  });

  describe('Creation of an execution role', () => {
    it('should be done via the sub-command "create-role"', () => {
      return icli.parse('node script.js create-role PlanetExpressLambdaExecution -m LambdaBasicExecutionRole'.split(' '))
      .then(res => {
        assert.ok(true);
      });
    });
  });

  describe('Creation of a node module', () => {
    it('should be done via the sub-command "create-node-module"', () => {
      return icli.parse('node script.js create-node-module log'.split(' '))
      .then(res => {
        assert.ok(true);
      });
    });
  });

  describe('Creation of a node module with a dependency', () => {
    it('should be done via the sub-command "create-node-module"', () => {
      return icli.parse('node script.js create-node-module data-access --dependencies log'.split(' '))
      .then(res => {
        assert.ok(true);
      });
    });
  });

  describe('Creation of a node Lambda', () => {
    it('should be done via the sub-command "create-node-lambda"', () => {
      return icli.parse('node script.js create-node-lambda api-generic -t 20 -m 256 -r PlanetExpressLambdaExecution --dependencies log'.split(' '))
      .then(res => {
        assert.ok(true);
      });
    });
  });

  describe('Creation of an invocation role', () => {
    it('should be done via the sub-command "create-role"', () => {
      return icli.parse('node script.js create-role PlanetExpressLambdaInvocation -m APIGatewayLambdaInvocation'.split(' '))
      .then(res => {
        assert.ok(true);
      });
    });
  });

  describe('Creation of APIs', () => {
    it('should be done via the sub-command "create-api"', () => {
      return icli.parse('node script.js create-api back-office -t "Back+Office" -d "Planet+Express+API+for+Back+Office"'.split(' '))
      .then(res => {
        return icli.parse('node script.js create-api sender -t "Sender" -d "Planet+Express+API+for+sender+application"'.split(' '));
      })
      .then(res => {
        return icli.parse('node script.js create-api recipient -t "Recipient" -d "Planet+Express+API+for+recipient+application"'.split(' '));
      })
      .then(res => {
        assert.ok(true);
      });
    });
  });

  describe('Creation of API endpoints', () => {
    it('should be done via the sub-command "create-endpoint"', () => {
      // eslint-disable-next-line max-len
      return icli.parse('node script.js create-endpoint /delivery get -a back-office,recipient,sender -s "View+a+delivery" -i lambda-proxy --auth none --role PlanetExpressLambdaInvocation -l api-generic'.split(' '))
      .then(res => {
        // eslint-disable-next-line max-len
        return icli.parse('node script.js create-endpoint /delivery patch -a back-office -s "Update+a+delivery" -i lambda-proxy --auth none --role PlanetExpressLambdaInvocation -l api-generic'.split(' '));
      })
      .then(res => {
        // eslint-disable-next-line max-len
        return icli.parse('node script.js create-endpoint /delivery put -a back-office,sender -s "Create+a+delivery" -i lambda-proxy --auth none --role PlanetExpressLambdaInvocation -l api-generic'.split(' '));
      })
      .then(res => {
        // eslint-disable-next-line max-len
        return icli.parse('node script.js create-endpoint /delivery delete -a back-office,recipient -s "Delete+a+delivery" -i lambda-proxy --auth none --role PlanetExpressLambdaInvocation -l api-generic'.split(' '));
      })
      .then(res => {
        assert.ok(true);
      });
    });
  });

  describe('Deployment of APIs in AWS', () => {
    it('should be done via the sub-command "deploy-apis"', function() {
      this.timeout(30000);
      return icli.parse('node script.js deploy-apis back-office -r us-east-1 -s v0 -e DEV --deploy-lambdas all'.split(' '))
      .then(res => {
        assert.ok(true);
      });
    });
  });

});
