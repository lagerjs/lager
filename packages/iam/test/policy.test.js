/*eslint-env mocha */
/* global testRequire */
'use strict';

const assert = require('assert');
const Policy = testRequire('src/policy');
const AWS = require('aws-sdk-mock');

describe('An IAM policy', () => {

  let policy;
  const context = { environment: 'TEST', stage: 'v0' };
  const listPolicies = {
    ResponseMetadata: { RequestId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
    Policies: [{
      PolicyName: 'ExistingPolicy',
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
  const createPolicy = {
    ResponseMetadata: { RequestId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
    Policy: {
      PolicyName: 'TEST_MyPolicy_v0',
      PolicyId: 'AAAAAAAAAAAAAAAAAAAAA',
      Arn: 'arn:aws:iam::000000000000:policy/TEST_MyPolicy_v0',
      Path: '/',
      DefaultVersionId: 'v1',
      AttachmentCount: 0,
      IsAttachable: true,
      CreateDate: new Date(),
      UpdateDate: new Date()
    }
  };
  const getPolicyVersion = {
    ResponseMetadata: { RequestId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
    PolicyVersion: {
      Document: '%7B%22Version%22%3A%222012-10-17%22%2C%22Statement%22%3A%5B%7B%22Effect'
              + '%22%3A%22Deny%22%2C%22Action%22%3A%5B%22%2A%22%5D%2C%22Resource'
              + '%22%3A%5B%22%2A%22%5D%7D%5D%7D',
      VersionId: 'v1',
      IsDefaultVersion: true,
      CreateDate: new Date()
    }
  };
  const createPolicyVersion = {
    PolicyName: 'TEST_MyPolicy_v0',
    PolicyId: 'AAAAAAAAAAAAAAAAAAAAA',
    Arn: 'arn:aws:iam::000000000000:policy/TEST_MyPolicy_v0',
    Path: '/',
    DefaultVersionId: 'v1',
    AttachmentCount: 0,
    IsAttachable: true,
    CreateDate: new Date(),
    UpdateDate: new Date()
  };
  let listPolicyVersions = {
    ResponseMetadata: { RequestId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
    Versions: [{
      VersionId: 'v1',
      IsDefaultVersion: false,
      CreateDate: new Date()
    }],
    IsTruncated: false
  };
  const listPolicyVersions5 = {
    ResponseMetadata: { RequestId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
    Versions: [{
      VersionId: 'v5',
      IsDefaultVersion: true,
      CreateDate: new Date()
    }, {
      VersionId: 'v4',
      IsDefaultVersion: false,
      CreateDate: new Date()
    }, {
      VersionId: 'v3',
      IsDefaultVersion: false,
      CreateDate: new Date()
    }, {
      VersionId: 'v2',
      IsDefaultVersion: false,
      CreateDate: new Date()
    }, {
      VersionId: 'v1',
      IsDefaultVersion: false,
      CreateDate: new Date()
    }],
    IsTruncated: false
  };
  const deletePolicyVersion = { ResponseMetadata: { RequestId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' } };

  before(() => {
    AWS.mock('IAM', 'listPolicies', (params, callback) => {
      callback(null, listPolicies);
    });
    AWS.mock('IAM', 'createPolicy', (params, callback) => {
      callback(null, createPolicy);
    });
    AWS.mock('IAM', 'getPolicyVersion', (params, callback) => {
      callback(null, getPolicyVersion);
    });
    AWS.mock('IAM', 'createPolicyVersion', (params, callback) => {
      callback(null, createPolicyVersion);
    });
    AWS.mock('IAM', 'listPolicyVersions', (params, callback) => {
      callback(null, listPolicyVersions);
    });
    AWS.mock('IAM', 'deletePolicyVersion', (params, callback) => {
      callback(null, deletePolicyVersion);
    });
  });

  after(() => {
    AWS.restore();
  });

  it('should be instantiated', () => {
    const document = {
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Deny',
        Action: ['*'],
        Resource: ['*']
      }]
    };
    policy = new Policy(document, 'MyPolicy');
    assert.ok(policy instanceof Policy);
  });


  it('should have a name', () => {
    assert.equal(policy.getName(), 'MyPolicy');
  });


  it('should be created for the first deployment', function() {
    return policy.deploy(context)
    .then(result => {
      assert.equal(result.report.name, 'TEST_MyPolicy_v0');
      assert.equal(result.report.operation, 'Creation');
      assert.equal(result.report.policyVersions, 1);
    });
  });


  it('should not add "_" to the policy name when the Lager "context" does not provide environment or stage', function() {
    return policy.deploy({ environment: '', stage: '' })
    .then(result => {
      assert.equal(result.report.name, 'MyPolicy');
      assert.equal(result.report.operation, 'Creation');
      assert.equal(result.report.policyVersions, 1);
    });
  });


  it('should not be updated for the second deployment if the document is the same', function() {
    listPolicies.Policies[0].PolicyName = 'TEST_MyPolicy_v0';
    return policy.deploy(context)
    .then(result => {
      assert.equal(result.report.name, 'TEST_MyPolicy_v0');
      assert.equal(result.report.operation, 'Already up-to-date');
    });
  });


  it('should be updated for the second deployment if the document is different', function() {
    policy.document.Statement[0].Action = ['xxx'];
    return policy.deploy(context)
    .then(result => {
      assert.equal(result.report.name, 'TEST_MyPolicy_v0');
      assert.equal(result.report.operation, 'Update');
      assert.equal(result.report.policyVersions, 1);
    });
  });


  it('should delete the most ancient version if there are already 5', function() {
    listPolicyVersions = listPolicyVersions5;
    return policy.deploy(context)
    .then(result => {
      assert.equal(result.report.name, 'TEST_MyPolicy_v0');
      assert.equal(result.report.operation, 'Update');
      assert.equal(result.report.deletedVersion, 'v1');
      assert.equal(result.report.policyVersions, 5);
    });
  });

});
