/*eslint-env mocha */
'use strict';

const assert = require('assert');
const rp = require('request-promise');
const catchStdout = require('../catch-stdout');
const icli = require('../../packages/cli/src/bin/lager');
const showStdout = !process.env.LAGER_SHOW_STDOUT;

describe('A project including the cors plugin', () => {

  let address; // = 'https://lb4wzam4nj.execute-api.us-east-1.amazonaws.com/v0';

  before(() => {
    process.chdir(__dirname);
  });

  beforeEach(() => {
    return icli.init();
  });

  it('should be deployed via the sub-command "deploy-apis"', function() {
    catchStdout.start(showStdout);
    this.timeout(10000);
    return icli.parse('node script.js deploy-apis cors-test -r us-east-1 -s v0 -e DEV'.split(' '))
    .then(res => {
      const stdout = catchStdout.stop();
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
    });
  });


  it('should allow to define public access to endpoints', function() {
    // We call the deployed API and test the response
    return rp({ uri: address + '/public', resolveWithFullResponse: true })
    .then(response => {
      assert.equal(response.statusCode, 200);
      assert.equal(response.headers['access-control-allow-origin'], '*');
      //console.log(JSON.stringify(response, null, 2));
      return rp({ uri: address + '/public', method: 'OPTIONS', resolveWithFullResponse: true });
    })
    .then(response => {
      assert.equal(response.statusCode, 200);
      assert.equal(response.headers['access-control-allow-origin'], '*');
      assert.equal(response.headers['access-control-allow-headers'], '*');
      assert.equal(response.headers['access-control-allow-methods'], 'DELETE,GET,PATCH,POST');
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
      assert.equal(response.headers['access-control-allow-methods'], 'DELETE,GET,PATCH,POST');
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


  it.skip('should allow to define access at the endpoint level', function() {
    // We call the deployed API and test the response
    return rp({ uri: address + '/mix', resolveWithFullResponse: true })
    .then(response => {
      assert.equal(response.statusCode, 200);
      assert.equal(response.headers['access-control-allow-origin'], '*');
      return rp({ uri: address + '/mix', method: 'PUT', resolveWithFullResponse: true });
    })
    .then(response => {
      assert.equal(response.statusCode, 200);
      assert.equal(response.headers['access-control-allow-origin'], '*');
      return rp({ uri: address + '/mix', method: 'OPTIONS', resolveWithFullResponse: true });
    })
    .then(response => {
      assert.equal(response.statusCode, 200);
      assert.equal(response.headers['access-control-allow-origin'], '*');
      assert.equal(response.headers['access-control-allow-headers'], '*');
      assert.equal(response.headers['access-control-allow-methods'], '');
      return rp({ uri: address + '/mix', method: 'POST', resolveWithFullResponse: true });
    })
    .then(response => {
      assert.equal(response.statusCode, 200);
      assert.equal(response.headers['access-control-allow-origin'], undefined);
    });
  });

});
