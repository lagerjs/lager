/*eslint-env mocha */
/* global testRequire */
'use strict';

const assert = require('assert');
const Lambda = testRequire('src/lambda');

describe('A Lambda', () => {

  let lambda;

  it('should be instantiated', () => {
    const config = {
      identifier: 'MyLambda',
      params: {
        Timeout: 20,
        MemorySize: 256,
        Role: 'PlanetExpressLambdaExecution'
      },
      includeEndpoints: true,
      modules: [
        'data-access',
        'log'
      ]
    };
    lambda = new Lambda(config);
    assert.ok(lambda instanceof Lambda);
  });

  it('should provide its identifier', () => {
    assert.equal(lambda.getIdentifier(), 'MyLambda');
  });

  it('should have a string representation', () => {
    assert.equal(lambda.toString(), 'Node Lambda MyLambda');
  });

  it('should provide the  list of its node modules', () => {
    return lambda.getNodeModules()
    .then(nodeModules => {
      assert.equal(nodeModules.log.name, 'log');
      assert.equal(nodeModules['data-access'].name, 'data-access');
    });
  });

});
