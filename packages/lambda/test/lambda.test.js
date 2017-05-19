/*eslint-env mocha */
/* global testRequire */
'use strict';

const path = require('path');
const assert = require('assert');
const AWS = require('aws-sdk-mock');
const Lambda = testRequire('src/lambda');

describe('A Lambda', () => {

  let callbackLambda, contextLambda;
  const context = { environment: 'TEST', stage: 'v0' };

  const invoke = {
    StatusCode: 200,
    Payload: '{\"msg\":\"This Lambda is not implemented!\",\"input\":{\"a\":\"b\"}}'
  };
  const resourceNotFoundException = new Error('ResourceNotFoundException');
  resourceNotFoundException.code = 'ResourceNotFoundException';
  const getFunction = {
    Configuration: {
      FunctionName: 'TEST-callback-lambda',
      FunctionArn: 'arn:aws:lambda:us-east-1:000000000000:function:TEST-callback-lambda',
      Runtime: 'nodejs4.3',
      Role: 'arn:aws:iam::000000000000:role/DEV_test_v0',
      Handler: 'lambda.handler',
      CodeSize: 3663,
      Description: '',
      Timeout: 20,
      MemorySize: 256,
      LastModified: '2017-01-01T00:00:00.000+0000',
      CodeSha256: 'XXXXXXXXXXXXXXXXXXXXX',
      Version: '$LATEST',
      KMSKeyArn: null
    },
    Code: {
      RepositoryType: 'S3',
      Location: 'https://prod-04-2014-tasks.s3.amazonaws.com/snapshots/000000000000/TEST-callback-lambda-xxxxxxxxxxxxxx'
    }
  };
  let getFunctionError = resourceNotFoundException;
  const createFunction = getFunction.Configuration;
  const publishVersion = getFunction.Configuration;
  const getAlias = {
    AliasArn: 'arn:aws:lambda:us-east-1:000000000000:function:TEST-callback-lambda:v0',
    Name: 'v0',
    FunctionVersion: '1',
    Description: ''
  };
  let getAliasError = resourceNotFoundException;
  const createAlias = getAlias;
  const updateAlias = {
    AliasArn: 'arn:aws:lambda:us-east-1:000000000000:function:TEST-callback-lambda:v0',
    Name: 'v0',
    FunctionVersion: '2',
    Description: ''
  };
  const updateFunctionCode = getFunction.Configuration;
  const updateFunctionConfiguration = getFunction.Configuration;

  before(() => {
    AWS.mock('Lambda', 'invoke', (params, callback) => {
      callback(null, invoke);
    });
    AWS.mock('Lambda', 'getFunction', (params, callback) => {
      callback(getFunctionError, getFunction);
    });
    AWS.mock('Lambda', 'createFunction', (params, callback) => {
      callback(null, createFunction);
    });
    AWS.mock('Lambda', 'publishVersion', (params, callback) => {
      callback(null, publishVersion);
    });
    AWS.mock('Lambda', 'getAlias', (params, callback) => {
      callback(getAliasError, getAlias);
    });
    AWS.mock('Lambda', 'createAlias', (params, callback) => {
      callback(null, createAlias);
    });
    AWS.mock('Lambda', 'updateAlias', (params, callback) => {
      callback(null, updateAlias);
    });
    AWS.mock('Lambda', 'updateFunctionCode', (params, callback) => {
      callback(null, updateFunctionCode);
    });
    AWS.mock('Lambda', 'updateFunctionConfiguration', (params, callback) => {
      callback(null, updateFunctionConfiguration);
    });
  });

  after(() => {
    AWS.restore();
  });

  it('should be instantiated', () => {
    const configA = require(path.join(__dirname, '..', 'test-assets', 'lambdas', 'callback-lambda', 'config'));
    configA.identifier = 'callback-lambda';
    callbackLambda = new Lambda(configA, path.join(__dirname, '..', 'test-assets', 'lambdas', 'callback-lambda'));

    const configB = require(path.join(__dirname, '..', 'test-assets', 'lambdas', 'context-lambda', 'config'));
    configB.identifier = 'context-lambda';
    contextLambda = new Lambda(configB, path.join(__dirname, '..', 'test-assets', 'lambdas', 'context-lambda'));

    assert.ok(callbackLambda instanceof Lambda);
    assert.ok(contextLambda instanceof Lambda);
  });

  it('should provide its identifier', () => {
    assert.equal(callbackLambda.getIdentifier(), 'callback-lambda');
  });

  it('should have a string representation', () => {
    assert.equal(callbackLambda.toString(), 'Node Lambda callback-lambda');
  });

  it('should provide its location on the file system', () => {
    const parts = callbackLambda.getFsPath().split(path.sep);
    assert.equal('callback-lambda', parts.pop());
    assert.equal('lambdas', parts.pop());
    assert.equal('test-assets', parts.pop());
    assert.equal('lambda', parts.pop());
  });

  it('should give the list of available event examples', () => {
    return callbackLambda.getEventExamples()
    .then(res => {
      assert.equal(res[0], 'test-a');
      assert.equal(res[1], 'test-b');
    });
  });

  it('should load an event example', () => {
    assert.equal(callbackLambda.loadEventExample('test-a').id, 123);
    assert.equal(callbackLambda.loadEventExample('test-b').id, 'ABC');
  });

  it('should be installed locally', () => {
    return callbackLambda.installLocally();
  });

  describe('local execution', () => {
    it('should work using a callback parameter', () => {
      return callbackLambda.executeLocally({ id: 42 })
      .then(res => {
        assert.equal(res.id, 42);
        assert.equal(res.content, 'fake');
      });
    });

    it('should work using context.succeed()', () => {
      return contextLambda.executeLocally({ success: true })
      .then(res => {
        assert.equal(res, 'A successful Lambda execution');
      });
    });

    it.skip('should work using context.fail()', () => {
      return contextLambda.executeLocally({ success: false })
      .then(res => {
        return Promise.reject(new Error('This code should not be reached'));
      })
      .catch(e => {
        assert.equal(e.message, 'An error should occur here');
        return Promise.resolve();
      });
    });
  });

  describe('deployment', () => {
    it('should create the Lambda for the first deployment', function() {
      return callbackLambda.deploy('us-east-1', context)
      .then(report => {
        assert.equal(report.name, 'TEST-callback-lambda');
        assert.equal(report.operation, 'Creation');
        assert.equal(report.aliasExisted, false);
        assert.ok(report.packageBuildTime[1]);
        assert.ok(report.deployTime[1]);
      });
    });

    it('should update the Lambda for the second deployment', function() {
      getFunctionError = null;
      getAliasError = null;
      return callbackLambda.deploy('us-east-1', context)
      .then(report => {
        assert.equal(report.name, 'TEST-callback-lambda');
        assert.equal(report.operation, 'Update');
        assert.equal(report.aliasExisted, true);
        assert.ok(report.packageBuildTime[1]);
        assert.ok(report.deployTime[1]);
      });
    });
  });

  it('should be executed in AWS', () => {
    return callbackLambda.execute('us-east-1', context, { a: 'b' })
    .then(res => {
      assert.equal(res.StatusCode, 200);
      assert.equal(res.Payload, '{"msg":"This Lambda is not implemented!","input":{"a":"b"}}');
    });
  });
});
