/*eslint-env mocha */
'use strict';

const assert = require('assert');
const rp = require('request-promise');
const icli = require('../../packages/cli/src/bin/myrmex');
const showStdout = !!process.env.MYRMEX_SHOW_STDOUT;
const apiDeployDelay = require('../api-deploy-delay');

describe('A project including the cors plugin', () => {

  let address = 'https://lb4wzam4nj.execute-api.us-east-1.amazonaws.com/v0';

  before(() => {
    process.chdir(__dirname);
  });

  beforeEach(() => {
    return icli.init();
  });

  it('should be deployed via the sub-command "deploy-apis"', function() {
    icli.catchPrintStart(showStdout);
    this.timeout(60000);
    return apiDeployDelay()
    .then(res => {
      return icli.parse('node script.js deploy-apis cors-test -r us-east-1 -s v0 -e DEV'.split(' '));
    })
    .then(res => {
      const stdout = icli.catchPrintStop();
      assert.ok(stdout.indexOf('/mix        ANY      X') > -1);
      assert.ok(stdout.indexOf('/mix        GET      X') > -1);
      assert.ok(stdout.indexOf('/private    POST     X') > -1);
      assert.ok(stdout.indexOf('/protected  GET      X') > -1);
      assert.ok(stdout.indexOf('/mix        OPTIONS  X') > -1);
      assert.ok(stdout.indexOf('/public     OPTIONS  X') > -1);
      assert.ok(stdout.indexOf('/private    OPTIONS  X') > -1);
      assert.ok(stdout.indexOf('/protected  OPTIONS  X') > -1);
      assert.ok(stdout.indexOf('Deploying cors-test ...') > -1);
      assert.ok(stdout.indexOf('cors-test   DEV cors-test - cors-test') > -1);
      assert.ok(stdout.indexOf('APIs have been published') > -1);
      address = /https:\/\/.+\.execute-api\.us-east-1\.amazonaws\.com\/v0/.exec(stdout)[0];

      // We delay the response to be sure that next tests will be based on the latest deployment
      // Indeed, it is possible to have a small delay for modifications to be applied
      return new Promise(resolve => {
        setTimeout(resolve(), 5000);
      });
    });
  });


  it('should allow to define public access to endpoints', function() {
    // We call the deployed API and test the response
    return rp({ uri: address + '/public', resolveWithFullResponse: true })
    .then(response => {
      assert.equal(response.statusCode, 200);
      assert.equal(response.headers['access-control-allow-origin'], '*');
      return rp({ uri: address + '/public', method: 'OPTIONS', resolveWithFullResponse: true });
    })
    .then(response => {
      assert.equal(response.statusCode, 200);
      assert.equal(response.headers['access-control-allow-origin'], '*');
      assert.equal(response.headers['access-control-allow-headers'], '*');
      assert.equal(response.headers['access-control-allow-methods'], 'GET,POST');
      return rp({ uri: address + '/public', method: 'POST', resolveWithFullResponse: true });
    })
    .then(response => {
      assert.equal(response.statusCode, 200);
      assert.equal(response.headers['access-control-allow-origin'], '*');
    });
  });


  it('should allow to define protected access to endpoints', function() {
    // We call the deployed API and test the response
    return rp({ uri: address + '/protected', resolveWithFullResponse: true })
    .then(response => {
      assert.equal(response.statusCode, 200);
      assert.equal(response.headers['access-control-allow-origin'], 'http://www.example.com');
      return rp({ uri: address + '/protected', method: 'OPTIONS', resolveWithFullResponse: true });
    })
    .then(response => {
      assert.equal(response.statusCode, 200);
      assert.equal(response.headers['access-control-allow-origin'], 'http://www.example.com');
      assert.equal(response.headers['access-control-allow-headers'], '*');
      assert.equal(response.headers['access-control-allow-methods'], 'GET,POST');
      return rp({ uri: address + '/protected', method: 'POST', resolveWithFullResponse: true });
    })
    .then(response => {
      assert.equal(response.statusCode, 200);
      assert.equal(response.headers['access-control-allow-origin'], 'http://www.example.com');
    });
  });


  it('should allow to define private access to endpoints', function() {
    // We call the deployed API and test the response
    return rp({ uri: address + '/private', resolveWithFullResponse: true })
    .then(response => {
      assert.equal(response.statusCode, 200);
      assert.equal(response.headers['access-control-allow-origin'], undefined);
      return rp({ uri: address + '/private', method: 'OPTIONS', resolveWithFullResponse: true });
    })
    .then(response => {
      assert.equal(response.statusCode, 200);
      assert.equal(response.headers['access-control-allow-origin'], '');
      assert.equal(response.headers['access-control-allow-headers'], '');
      assert.equal(response.headers['access-control-allow-methods'], '');
      return rp({ uri: address + '/private', method: 'POST', resolveWithFullResponse: true });
    })
    .then(response => {
      assert.equal(response.statusCode, 200);
      assert.equal(response.headers['access-control-allow-origin'], undefined);
    });
  });


  it('should allow to define access at the endpoint level', function() {
    // We call the deployed API and test the response
    return rp({ uri: address + '/mix', resolveWithFullResponse: true })
    .then(response => {
      // GET is explicitely allowed
      assert.equal(response.statusCode, 200);
      assert.equal(response.headers['access-control-allow-origin'], '*');
      return rp({ uri: address + '/mix', method: 'PUT', resolveWithFullResponse: true });
    })
    .then(response => {
      // PUT is allowed because of the definition of ANY
      assert.equal(response.statusCode, 200);
      assert.equal(response.headers['access-control-allow-origin'], '*');
      return rp({ uri: address + '/mix', method: 'OPTIONS', resolveWithFullResponse: true });
    })
    .then(response => {
      // OPTIONS show that all methods are allowed except POST
      assert.equal(response.statusCode, 200);
      assert.equal(response.headers['access-control-allow-origin'], '*');
      assert.equal(response.headers['access-control-allow-headers'], '*');
      assert.equal(response.headers['access-control-allow-methods'], 'GET,PUT,PATCH,DELETE,HEAD,OPTIONS');
      return rp({ uri: address + '/mix', method: 'POST', resolveWithFullResponse: true });
    })
    .then(response => {
      // GET is not allowed
      assert.equal(response.statusCode, 200);
      assert.equal(response.headers['access-control-allow-origin'], undefined);
    });
  });


  it('should allow to define a specific configuration for an API', function() {
    return icli.myrmex.getPlugin('api-gateway').findApi('cors-test-2')
    .then(api => {
      return api.generateSpec('api-gateway');
    })
    .then(spec => {
      assert.equal(
        spec.paths['/mix'].post['x-amazon-apigateway-integration']
          .responses.default.responseParameters['method.response.header.Access-Control-Allow-Origin'],
        '\'http://cors-test-2.1.example.com\''
      );
      assert.equal(
        spec.paths['/mix'].options['x-amazon-apigateway-integration']
          .responses.default.responseParameters['method.response.header.Access-Control-Allow-Origin'],
        '\'http://cors-test-2.1.example.com\''
      );
      assert.equal(
        spec.paths['/mix'].options['x-amazon-apigateway-integration']
          .responses.default.responseParameters['method.response.header.Access-Control-Allow-Methods'],
        '\'POST\''
      );
      assert.equal(
        spec.paths['/protected'].get['x-amazon-apigateway-integration']
          .responses.default.responseParameters['method.response.header.Access-Control-Allow-Origin'],
        '\'http://cors-test-2.2.example.com\''
      );
      assert.equal(
        spec.paths['/protected'].post['x-amazon-apigateway-integration']
          .responses.default.responseParameters['method.response.header.Access-Control-Allow-Origin'],
        '\'http://cors-test-2.2.example.com\''
      );
      assert.equal(
        spec.paths['/protected'].options['x-amazon-apigateway-integration']
          .responses.default.responseParameters['method.response.header.Access-Control-Allow-Origin'],
        '\'http://cors-test-2.2.example.com\''
      );
      assert.equal(
        spec.paths['/protected'].options['x-amazon-apigateway-integration']
          .responses.default.responseParameters['method.response.header.Access-Control-Allow-Methods'],
        '\'GET,POST\''
      );
    });
  });

});
