/*eslint-env mocha */
/* global testRequire */
'use strict';

const assert = require('assert');
const Model = testRequire('src/model');
const plugin = testRequire('src/index');

describe('A model', () => {

  let model;
  const spec = {
    type: 'object',
    properties: {
      id: {
        type: 'integer',
        format: 'int64'
      },
      name: {
        type: 'string'
      },
      nested: {
        $ref: '#/definitions/MyNestedModel'
      }
    }
  };
  let nestedModel;
  const nestedSpec = {
    type: 'object',
    properties: {
      id: {
        type: 'integer',
        format: 'int64'
      },
      label: {
        type: 'string'
      }
    }
  };

  it('should be instantiated', () => {
    model = new Model('my-model', spec);
    nestedModel = new Model('my-nested-model', nestedSpec);
    assert.ok(model instanceof Model);
    assert.ok(nestedModel instanceof Model);
    plugin.lager.when('afterModelsLoad', models => {
      models.push(model);
      models.push(nestedModel);
      return Promise.resolve();
    });
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

  it('should retrieve child models', () => {
    return model.getNestedModelsList()
    .then(models => {
      assert.equal(models.length, 1);
    });
  });
});
