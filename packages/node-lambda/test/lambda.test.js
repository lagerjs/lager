/*eslint-env mocha */
/* global testRequire */
'use strict';

const path = require('path');
const assert = require('assert');
const AWS = require('aws-sdk-mock');
const Lambda = testRequire('src/lambda');

describe('A Lambda', () => {

  let lambda;
  const context = { environment: 'TEST', stage: 'v0' };

  const invoke = {
    StatusCode: 200,
    Payload: '{\"msg\":\"This Lambda is not implemented!\",\"input\":{\"a\":\"b\"}}'
  };
  const resourceNotFoundException = new Error('ResourceNotFoundException');
  resourceNotFoundException.code = 'ResourceNotFoundException';
  const getFunction = {
    Configuration: {
      FunctionName: 'TEST-my-lambda',
      FunctionArn: 'arn:aws:lambda:us-east-1:000000000000:function:TEST-my-lambda',
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
      Location: 'https://prod-04-2014-tasks.s3.amazonaws.com/snapshots/000000000000/TEST-my-lambda-xxxxxxxxxxxxxx'
    }
  };
  let getFunctionError = resourceNotFoundException;
  const createFunction = getFunction.Configuration;
  const publishVersion = getFunction.Configuration;
  const getAlias = {
    AliasArn: 'arn:aws:lambda:us-east-1:000000000000:function:TEST-my-lambda:v0',
    Name: 'v0',
    FunctionVersion: '1',
    Description: ''
  };
  let getAliasError = resourceNotFoundException;
  const createAlias = getAlias;
  const updateAlias = {
    AliasArn: 'arn:aws:lambda:us-east-1:000000000000:function:TEST-my-lambda:v0',
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
    const config = require(path.join(__dirname, '..', 'test-assets', 'lambdas', 'my-lambda', 'config'));
    config.identifier = 'my-lambda';
    lambda = new Lambda(config, path.join(__dirname, '..', 'test-assets', 'lambdas', 'my-lambda'));
    assert.ok(lambda instanceof Lambda);
  });

  it('should provide its identifier', () => {
    assert.equal(lambda.getIdentifier(), 'my-lambda');
  });

  it('should have a string representation', () => {
    assert.equal(lambda.toString(), 'Node Lambda my-lambda');
  });

  it('should provide its location on the file system', () => {
    const parts = lambda.getFsPath().split(path.sep);
    assert.equal('my-lambda', parts.pop());
    assert.equal('lambdas', parts.pop());
    assert.equal('test-assets', parts.pop());
    assert.equal('node-lambda', parts.pop());
  });

  it('should give the list of available event examples', () => {
    return lambda.getEventExamples()
    .then(res => {
      assert.equal(res[0], 'test-a');
      assert.equal(res[1], 'test-b');
    });
  });

  it('should load an event example', () => {
    const example = lambda.loadEventExample('test-a');
    assert.equal(example.key1, 'value1');
    assert.equal(example.key2, 'value2');
    assert.equal(example.key3, 'value3');
  });

  it.skip('should be executed locally', () => {
    return lambda.executeLocally({ a: 'b' })
    .then(res => {
      assert.equal(res.msg, 'This Lambda is not implemented!');
      assert.equal(res.input.a, 'b');
    });
  });

  it('should be executed in AWS', () => {
    return lambda.execute('us-east-1', context, { a: 'b' })
    .then(res => {
      assert.equal(res.StatusCode, 200);
      assert.equal(res.Payload, '{"msg":"This Lambda is not implemented!","input":{"a":"b"}}');
    });
  });

  describe.skip('deployment', () => {

    it('should create the Lambda for the first deployment', function() {
      this.timeout(10000);
      return lambda.deploy('us-east-1', context)
      .then(res => {
        assert.equal(res.report.name, 'TEST-my-lambda');
        assert.equal(res.report.operation, 'Creation');
        assert.equal(res.report.aliasExisted, false);
        assert.ok(res.report.packageBuildTime[1]);
        assert.ok(res.report.deployTime[1]);
      });
    });

    it('should update the Lambda for the second deployment', function() {
      getFunctionError = null;
      getAliasError = null;
      this.timeout(10000);
      return lambda.deploy('us-east-1', context)
      .then(res => {
        assert.equal(res.report.name, 'TEST-my-lambda');
        assert.equal(res.report.operation, 'Update');
        assert.equal(res.report.aliasExisted, true);
        assert.ok(res.report.packageBuildTime[1]);
        assert.ok(res.report.deployTime[1]);
      });
    });

  });

});
