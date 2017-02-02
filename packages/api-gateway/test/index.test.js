/*eslint-env mocha */
/* global testRequire */
'use strict';

const assert = require('assert');
const plugin = testRequire('src/index');

describe('The api-gateway plugin', function() {

  it('should load the APIs of a project', () => {
    return plugin.loadApis()
    .then(apis => {
      assert.equal(apis.length, 3);
      assert.equal(apis[0].getIdentifier(), 'bo');
      assert.equal(apis[1].getIdentifier(), 'recipient');
      assert.equal(apis[2].getIdentifier(), 'sender');
    });
  });

  it('should load the endpoints of a project', () => {
    return plugin.loadEndpoints()
    .then(endpoints => {
      assert.equal(endpoints.length, 4);
      assert.equal(endpoints[0].toString(), 'Endpoint DELETE /delivery');
      assert.equal(endpoints[1].toString(), 'Endpoint GET /delivery');
      assert.equal(endpoints[2].toString(), 'Endpoint PATCH /delivery');
      assert.equal(endpoints[3].toString(), 'Endpoint PUT /delivery');
    });
  });

  it('should load the models of a project', () => {
    return plugin.loadModels()
    .then(models => {
      assert.equal(models.length, 1);
      assert.equal(models[0].toString(), 'Model delivery');
    });
  });

  it('should find an API by its identifier', () => {
    return plugin.findApi('bo')
    .then(api => {
      assert.equal(api.getIdentifier(), 'bo');
    });
  });

  it('should find an endpoint by its resource path and its method', () => {
    return plugin.findEndpoint('/delivery', 'GET')
    .then(endpoint => {
      assert.equal(endpoint.toString(), 'Endpoint GET /delivery');
    });
  });

  it('should find a model by its name', () => {
    return plugin.findModel('Delivery')
    .then(model => {
      assert.equal(model.toString(), 'Model delivery');
    });
  });

});
