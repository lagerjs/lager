/*eslint-env mocha */
/* global testRequire */
'use strict';

const assert = require('assert');
const Model = testRequire('src/model');

describe('A model', () => {

  let model;
  const spec = {
    type: 'object',
    properties: {}
  };

  it('should be instantiated', () => {
    model = new Model('my-model', spec);
    assert.ok(model instanceof Model);
  });

  it('should provide its name', () => {
    assert.equal(model.getName(), 'my-model');
    assert.equal(model.getName('spec'), 'MyModel');
  });

  it('should provide its specification', () => {
    assert.equal(model.getSpec().type, 'object');
  });

  it('should have a string representation', () => {
    assert.equal(model.toString(), 'Model my-model');
  });

});
