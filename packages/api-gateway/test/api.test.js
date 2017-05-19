/*eslint-env mocha */
/* global testRequire */
'use strict';

const assert = require('assert');
const Api = testRequire('src/api');
const Endpoint = testRequire('src/endpoint');
const AWS = require('aws-sdk-mock');

describe('An API', () => {

  let api;
  const context = { environment: 'TEST', stage: 'v0' };
  const spec = {
    swagger: '2.0',
    info: {
      title: 'my-api',
      description: 'my-api - an API built with Lager'
    },
    schemes: [
      'https'
    ],
    host: 'API_ID.execute-api.REGION.amazonaws.com',
    paths: {},
    definitions: {}
  };
  const endpointSpec = {
    consumes: [
      'application/json'
    ],
    produces: [
      'application/json'
    ],
    responses: {
      '200': {
        description: '200 response'
      }
    },
    'x-amazon-apigateway-integration': {
      responses: {
        default: {
          statusCode: '200'
        }
      },
      requestTemplates: {
        'application/json': '{\'statusCode\': 200}'
      },
      passthroughBehavior: 'when_no_match',
      type: 'mock'
    }
  };
  const endpoint = new Endpoint(endpointSpec, '/my-resource', 'GET');

  const getRestApis = {
    items: [{
      id: 'aaaaaaaaaa',
      name: 'an-api - an-api',
      description: 'an-api - an API built with Lager',
      createdDate: new Date()
    }, {
      id: 'bbbbbbbbbb',
      name: 'another-api - another-api',
      description: 'another-api - an API built with Lager',
      createdDate: new Date()
    }, {
      id: 'cccccccccc',
      name: 'an-api-not-created-by-lager',
      createdDate: new Date()
    }]
  };

  const importRestApi = {
    id: 'dddddddddd',
    name: 'TEST my-api - my-api',
    description: 'my-api - an API built with Lager',
    createdDate: new Date()
  };
  const putRestApi = importRestApi;
  const createDeployment = {
    id: 'xxxxxx',
    createdDate: new Date()
  };

  before(() => {
    AWS.mock('APIGateway', 'getRestApis', (params, callback) => {
      callback(null, getRestApis);
    });
    AWS.mock('APIGateway', 'importRestApi', (params, callback) => {
      callback(null, importRestApi);
    });
    AWS.mock('APIGateway', 'putRestApi', (params, callback) => {
      console.log('mock', 'putRestApi')
      callback(null, putRestApi);
    });
    AWS.mock('APIGateway', 'createDeployment', (params, callback) => {
      callback(null, createDeployment);
    });
  });

  it('should be instantiated', () => {
    api = new Api(spec, 'my-api');
    assert.ok(api instanceof Api);
  });

  it('should provide its identifier', () => {
    assert.equal(api.getIdentifier(), 'my-api');
  });

  it('should have a string representation', () => {
    assert.equal(api.toString(), 'API my-api');
  });

  it('should indicate if it exposes an endpoint or not', () => {
    assert.equal(api.doesExposeEndpoint(endpoint), false);
    endpointSpec['x-lager'] = { apis: [ 'my-api' ] };
    assert.equal(api.doesExposeEndpoint(endpoint), true);
  });

  it('should register an endpoint and its models', () => {
    delete endpointSpec['x-lager'];
    assert.equal(api.endpoints.length, 0);
    assert.equal(api.models.length, 0);
    endpointSpec['x-lager'] = { apis: [ 'my-api' ] };
    return api.addEndpoint(endpoint)
    .then(api => {
      assert.equal(api.endpoints.length, 1);
      assert.equal(api.models.length, 0);
    });
  });

  it('should generate its doc specification', () => {
    return api.generateSpec('doc', context)
    .then(spec => {
      assert.equal(spec.info.title, 'my-api');
      assert.equal(spec.paths['/my-resource'].get['x-amazon-apigateway-integration'], undefined);
    });
  });

  it('should generate its AWS specification', () => {
    return api.generateSpec('api-gateway', context)
    .then(spec => {
      assert.equal(spec.info.title, 'TEST my-api - my-api');
      assert.equal(spec.paths['/my-resource'].get['x-amazon-apigateway-integration'].type, 'mock');
    });
  });

  it('should generate its complete specification', () => {
    return api.generateSpec('complete', context)
    .then(spec => {
      assert.equal(spec.info.title, 'my-api');
      assert.equal(spec.paths['/my-resource'].get['x-amazon-apigateway-integration'].type, 'mock');
    });
  });

  it('should be created for the first deployment', function() {
    return api.deploy('us-east-1', context)
    .then(result => {
      assert.equal(result.report.name, 'TEST my-api - my-api');
      assert.equal(result.report.operation, 'Creation');
    });
  });

  it('should be updated for the second deployment', function() {
    getRestApis.items.push(importRestApi);
    return api.deploy('us-east-1', context)
    .then(result => {
      assert.equal(result.report.name, 'TEST my-api - my-api');
      assert.equal(result.report.operation, 'Update');
    });
  });

  it('should publish an API', function() {
    return api.publish('us-east-1', context)
    .then(api => {
      assert.ok(api instanceof Api);
    });
  });

});
