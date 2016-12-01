/*eslint-env mocha */
/* global testRequire */
'use strict';

const assert = require('assert');
const plugin = testRequire('src/index');

describe('The iam plugin', function() {

  it('should load the policies of a project', () => {
    return plugin.loadPolicies()
    .then(policies => {
      assert.equal(policies.length, 1);
      assert.equal(policies[0].getName(), 'MyPolicy');
    });
  });

  it('should load the roles of a project', () => {
    return plugin.loadRoles()
    .then(roles => {
      assert.equal(roles.length, 2);
      assert.equal(roles[0].getName(), 'PlanetExpressLambdaExecution');
    });
  });

});
