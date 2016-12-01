/*eslint-env mocha */
/* global testRequire */
'use strict';

const assert = require('assert');
const Policy = testRequire('src/policy');

describe('An IAM policy', () => {

  let policy;

  it('should be instantiated', () => {
    const document = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Deny',
          Action: [
            '*'
          ],
          Resource: [
            '*'
          ]
        }
      ]
    };
    policy = new Policy(document, 'MyPolicy');
    assert.ok(policy instanceof Policy);
  });

  it('should have a name', () => {
    assert.equal(policy.getName(), 'MyPolicy');
  });

});
