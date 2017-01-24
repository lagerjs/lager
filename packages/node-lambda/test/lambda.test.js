/*eslint-env mocha */
/* global testRequire */
'use strict';

const assert = require('assert');
const AWS = require('aws-sdk-mock');
const Lambda = testRequire('src/lambda');

describe('A Lambda', () => {

  let lambda;
  const context = { environment: 'TEST', stage: 'v0' };

  // before(() => {
  //   AWS.mock('Lambda', 'createFunction', (params, callback) => {
  //     callback(null, createFunction);
  //   });
  // });
  //
  // after(() => {
  //   AWS.restore();
  // });

  it('should be instantiated', () => {
    const config = {
      identifier: 'MyLambda',
      params: {
        Timeout: 20,
        MemorySize: 256,
        Role: 'PlanetExpressLambdaExecution'
      },
      includeEndpoints: true
    };
    const packageJson = {
      'x-lager': {
        dependencies: [
          'data-access',
          'log'
        ]
      }
    };
    lambda = new Lambda(config, packageJson);
    assert.ok(lambda instanceof Lambda);
  });

  it('should provide its identifier', () => {
    assert.equal(lambda.getIdentifier(), 'MyLambda');
  });

  it('should have a string representation', () => {
    assert.equal(lambda.toString(), 'Node Lambda MyLambda');
  });

  it.skip('should provide its location on the file system', () => {
    return lambda.getFsPath();
  });

  it.skip('should give the list of available event examples', () => {
    return lambda.getEventExamples();
  });

  it.skip('should be executed in AWS', () => {
    return lambda.execute();
  });

  it.skip('should be executed locally', () => {
    return lambda.executeLocally();
  });

  describe.skip('deployment', () => {

    it('should create the Lambda we executed for the first time', () => {
      return lambda.deploy();
    });

    it('should update the Lambda we executed for the second time', () => {
      return lambda.deploy();
    });

  });

});
