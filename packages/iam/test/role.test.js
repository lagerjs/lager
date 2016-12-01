/*eslint-env mocha */
/* global testRequire */
'use strict';

const assert = require('assert');
const Role = testRequire('src/role');

describe('An IAM role', () => {

  let role;

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
});
