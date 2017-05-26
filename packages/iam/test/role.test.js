/*eslint-env mocha */
/* global testRequire */
'use strict';

const assert = require('assert');
const Role = testRequire('src/role');
const AWS = require('aws-sdk-mock');

describe('An IAM role', () => {

  let role;
  const context = { environment: 'TEST', stage: 'v0' };
  let getRoleError = null;
  const getRole = {
    ResponseMetadata: { RequestId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
    Role: {
      Path: '/',
      RoleName: 'TEST_MyRole_v0',
      RoleId: 'AAAAAAAAAAAAAAAAAAAAA',
      Arn: 'arn:aws:iam::000000000000:role/TEST_MyRole_v0',
      CreateDate: new Date(),
      AssumeRolePolicyDocument: '%7B%22Version%22%3A%222012-10-17%22%2C%22Statement%22%3A%5B%7B%22'
                              + 'Effect%22%3A%22Allow%22%2C%22Principal%22%3A%7B%22Service%22%3A%22'
                              + 'lambda.amazonaws.com%22%7D%2C%22Action%22%3A%22sts%3AAssumeRole%22%7D%5D%7D'
    }
  };
  const createRole = {
    ResponseMetadata: { RequestId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
    Role: {
      Path: '/',
      RoleName: 'TEST_MyRole_v0',
      RoleId: 'AAAAAAAAAAAAAAAAAAAAA',
      Arn: 'arn:aws:iam::000000000000:role/TEST_MyRole_v0',
      CreateDate: new Date(),
      AssumeRolePolicyDocument: '%7B%22Version%22%3A%222012-10-17%22%2C%22Statement%22%3A%5B%7B%22'
                              + 'Effect%22%3A%22Allow%22%2C%22Principal%22%3A%7B%22Service%22%3A%22'
                              + 'lambda.amazonaws.com%22%7D%2C%22Action%22%3A%22sts%3AAssumeRole%22%7D%5D%7D'
    }
  };
  const updateAssumeRolePolicy = { ResponseMetadata: { RequestId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' } };
  const attachRolePolicy = { ResponseMetadata: { RequestId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' } };
  const listPolicies = {
    ResponseMetadata: { RequestId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
    Policies: [{
      PolicyName: 'MyPolicy',
      PolicyId: 'AAAAAAAAAAAAAAAAAAAAA',
      Arn: 'arn:aws:iam::000000000000:policy/ExistingPolicy',
      Path: '/',
      DefaultVersionId: 'v1',
      AttachmentCount: 0,
      IsAttachable: true,
      CreateDate: new Date(),
      UpdateDate: new Date()
    }],
    IsTruncated: false
  };

  before(() => {
    AWS.mock('IAM', 'getRole', (params, callback) => {
      callback(getRoleError, getRole);
    });
    AWS.mock('IAM', 'createRole', (params, callback) => {
      callback(null, createRole);
    });
    AWS.mock('IAM', 'updateAssumeRolePolicy', (params, callback) => {
      callback(null, updateAssumeRolePolicy);
    });
    AWS.mock('IAM', 'attachRolePolicy', (params, callback) => {
      callback(null, attachRolePolicy);
    });
    AWS.mock('IAM', 'listPolicies', (params, callback) => {
      callback(null, listPolicies);
    });
  });

  after(() => {
    AWS.restore();
  });

  it('should be instantiated', () => {
    const config = {
      description: 'A testing role',
      'managed-policies': [
        'MyPolicy'
      ],
      'inline-policies': [],
      'trust-relationship': {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: {
              Service: 'lambda.amazonaws.com'
            },
            Action: 'sts:AssumeRole'
          }
        ]
      }
    };

    role = new Role(config, 'MyRole');
    assert.ok(role instanceof Role);
  });

  it('should have a name', () => {
    assert.equal(role.getName(), 'MyRole');
  });

  it('should have a description', () => {
    assert.equal(role.getDescription(), 'A testing role');
  });

  it('should be created for the first deployment', function() {
    getRoleError = new Error('NoSuchEntity');
    getRoleError.code = 'NoSuchEntity';
    return role.deploy(context)
    .then(report => {
      assert.equal(report.name, 'TEST_MyRole_v0');
      assert.equal(report.operation, 'Creation');
    });
  });


  it('should not add "_" to the role name when the Myrmex "context" does not provide environment or stage', function() {
    return role.deploy({ environment: '', stage: '' })
    .then(report => {
      assert.equal(report.name, 'MyRole');
      assert.equal(report.operation, 'Creation');
    });
  });


  it('should be updated for the second deployment', function() {
    getRoleError = null;
    return role.deploy(context)
    .then(report => {
      assert.equal(report.name, 'TEST_MyRole_v0');
      assert.equal(report.operation, 'Update');
    });
  });

});
