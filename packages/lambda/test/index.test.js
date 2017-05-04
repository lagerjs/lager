/*eslint-env mocha */
/* global testRequire */
'use strict';

const assert = require('assert');
const nodeLambdaPlugin = testRequire('src/index');

describe('The lambda plugin', () => {

  it('should load the lambdas of a project', () => {
    return nodeLambdaPlugin.loadLambdas()
    .then(lambdas => {
      assert.equal(lambdas.length, 2);
      assert.equal(lambdas[0].getIdentifier(), 'empty-lambda');
      assert.equal(lambdas[1].getIdentifier(), 'my-lambda');
    });
  });

  it('should load the node modules of a project', () => {
    return nodeLambdaPlugin.loadModules()
    .then(nodeModules => {
      assert.equal(nodeModules.length, 2);
      assert.equal(nodeModules[0].name, 'data-access');
    });
  });

  it('should give a list of usefull IAM policies', () => {
    return nodeLambdaPlugin.getPolicies()
    .then(policies => {
      assert.equal(policies.length, 2);
      assert.equal(policies[0].identifier, 'deploy-lambdas');
    });
  });

});
