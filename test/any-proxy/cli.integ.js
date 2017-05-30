/*eslint-env mocha */
'use strict';

const path = require('path');
const assert = require('assert');
const Promise = require('bluebird');
const rp = require('request-promise');
const fs = require('fs-extra');
const remove = Promise.promisify(fs.remove);
const icli = require('../../packages/cli/src/bin/myrmex');
const showStdout = !!process.env.MYRMEX_SHOW_STDOUT;
const apiDeployDelay = require('../api-deploy-delay');

describe('Creation and deployment of a proxy integration with ANY http method', () => {

  before(() => {
    process.chdir(__dirname);
  });

  beforeEach(() => {
    return icli.init();
  });

  after(() => {
    return Promise.all([
      remove(path.join(__dirname, 'api-gateway')),
      remove(path.join(__dirname, 'lambda')),
      remove(path.join(__dirname, 'myrmex.log'))
    ]);
  });

  describe('Creation of a node Lambda', () => {
    it('should be done via the sub-command "create-lambda"', () => {
      icli.catchPrintStart(showStdout);
      // eslint-disable-next-line max-len
      return icli.parse(('node script.js create-lambda any-proxy -r nodejs6.10 -t 20 -m 128 --role arn:aws:iam::' + process.env.AWS_ACCOUNT_ID + ':role/LambdaBasicExecution').split(' '))
      .then(res => {
        const stdout = icli.catchPrintStop();
        assert.ok(stdout.indexOf('The Lambda \x1b[36many-proxy\x1b[0m has been created') > -1);
      });
    });
  });

  describe('Creation of an API', () => {
    it('should be done via the sub-command "create-api"', () => {
      icli.catchPrintStart(showStdout);
      return icli.parse('node script.js create-api any-proxy -t Any+proxy -d Lambda+proxy+integration+for+any+http+request'.split(' '))
      .then(res => {
        const stdout = icli.catchPrintStop();
        assert.ok(stdout.indexOf('The API "\x1b[36many-proxy\x1b[0m" has been created') > -1);
      });
    });
  });

  describe('Creation of endpoints', () => {
    it('should be done via the sub-command "create-endpoint"', () => {
      icli.catchPrintStart(showStdout);
      // eslint-disable-next-line max-len
      return icli.parse(('node script.js create-endpoint /{proxy+} any -a any-proxy -s Catch+all+non+root+request -i lambda-proxy --auth none --role arn:aws:iam::' + process.env.AWS_ACCOUNT_ID + ':role/APIGatewayInvokeLambda --lambda any-proxy').split(' '))
      .then(res => {
        // eslint-disable-next-line max-len
        return icli.parse(('node script.js create-endpoint / any -a any-proxy -s Catch+all+root+request -i lambda-proxy --auth none --role arn:aws:iam::' + process.env.AWS_ACCOUNT_ID + ':role/APIGatewayInvokeLambda --lambda any-proxy').split(' '));
      })
      .then(res => {
        const stdout = icli.catchPrintStop();
        assert.ok(stdout.indexOf('The endpoint \x1b[36mANY /{proxy+}\x1b[0m has been created') > -1);
        assert.ok(stdout.indexOf('The endpoint \x1b[36mANY /\x1b[0m has been created') > -1);
      });
    });
  });

  describe('Swagger API specification for documentation purpose', () => {
    it('should duplicate the ANY endpoint definition for each http method', () => {
      icli.catchPrintStart(showStdout);
      return icli.parse('node script.js inspect-api any-proxy -s doc -c'.split(' '))
      .then(res => {
        icli.catchPrintStop();
        assert.equal(res.paths['/{proxy+}'].get.summary, 'Catch+all+non+root+request');
        assert.equal(res.paths['/{proxy+}'].post.summary, 'Catch+all+non+root+request');
        assert.equal(res.paths['/{proxy+}'].put.summary, 'Catch+all+non+root+request');
        assert.equal(res.paths['/{proxy+}'].patch.summary, 'Catch+all+non+root+request');
        assert.equal(res.paths['/{proxy+}'].delete.summary, 'Catch+all+non+root+request');
        assert.equal(res.paths['/{proxy+}'].head.summary, 'Catch+all+non+root+request');
        assert.equal(res.paths['/{proxy+}'].options.summary, 'Catch+all+non+root+request');
      });
    });
  });

  describe('Deployment of an API in AWS', () => {
    it('should be done via the sub-command "deploy-apis"', function() {
      this.timeout(60000);
      icli.catchPrintStart(showStdout);
      return apiDeployDelay()
      .then(res => {
        return icli.parse('node script.js deploy-apis any-proxy -r us-east-1 -s v0 -e DEV --deploy-lambdas all --alias v0'.split(' '));
      })
      .then(res => {
        const stdout = icli.catchPrintStop();
        assert.ok(stdout.indexOf('/          ANY     X') > -1);
        assert.ok(stdout.indexOf('/{proxy+}  ANY     X') > -1);
        assert.ok(stdout.indexOf('1 Lambda(s) to deploy: any-proxy') > -1);
        assert.ok(stdout.indexOf('Deploying any-proxy ...') > -1);
        assert.ok(stdout.indexOf('any-proxy   DEV any-proxy - Any+proxy') > -1);
        assert.ok(stdout.indexOf('APIs have been published') > -1);

        // We call the deployed API and test the response
        const address = /https:\/\/.+\.execute-api\.us-east-1\.amazonaws\.com\/v0/.exec(stdout);
        return rp({ uri: address + '/integration/test?q=query', json: true });
      })
      .then(res => {
        assert.equal(res.event.resource, '/{proxy+}');
        assert.equal(res.event.path, '/integration/test');
        assert.equal(res.event.httpMethod, 'GET');
        assert.equal(res.event.queryStringParameters.q, 'query');
        assert.equal(res.event.pathParameters.proxy, 'integration/test');
      });
    });
  });

});
