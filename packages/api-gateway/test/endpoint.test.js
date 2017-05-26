/*eslint-env mocha */
/* global testRequire */
'use strict';

const assert = require('assert');
const Endpoint = testRequire('src/endpoint');

describe('An endpoint', () => {

  let endpoint;
  const spec = {
    'x-myrmex': {
      apis: [
        'my-api'
      ],
      lambda: 'my-lambda'
    },
    summary: '',
    produces: [
      'application/json'
    ],
    responses: {
      '200': {
        'description': '200 response'
      }
    },
    'x-amazon-apigateway-integration': {
      credentials: 'api-invoke-lambda',
      responses: {
        default: {
          statusCode: '200'
        }
      },
      passthroughBehavior: 'when_no_match',
      contentHandling: 'CONVERT_TO_TEXT',
      type: 'aws'
    }
  };

  it('should be instantiated', () => {
    endpoint = new Endpoint(spec, '/my-resource', 'GET');
    assert.ok(endpoint instanceof Endpoint);
  });

  it('should provide its method', () => {
    assert.equal(endpoint.getMethod(), 'GET');
  });

  it('should provide its resource path', () => {
    assert.equal(endpoint.getResourcePath(), '/my-resource');
  });

  it('should have a string representation', () => {
    assert.equal(endpoint.toString(), 'Endpoint GET /my-resource');
  });

  it('should provide a base specification', () => {
    assert.equal(endpoint.getSpec(), spec);
  });

  it('should generate its doc specification', () => {
    const spec = endpoint.generateSpec('doc');
    assert.equal(spec.produces[0], 'application/json');
    assert.equal(spec['x-amazon-apigateway-integration'], undefined);
    assert.equal(spec['x-myrmex'], undefined);
  });

  it('should generate its AWS specification', () => {
    const spec = endpoint.generateSpec('api-gateway');
    assert.equal(spec.produces[0], 'application/json');
    assert.equal(spec['x-amazon-apigateway-integration'].credentials, 'api-invoke-lambda');
    assert.equal(spec['x-myrmex'], undefined);
  });

  it('should generate its complete specification', () => {
    const spec = endpoint.generateSpec('complete');
    assert.equal(spec.produces[0], 'application/json');
    assert.equal(spec['x-amazon-apigateway-integration'].credentials, 'api-invoke-lambda');
    assert.equal(spec['x-myrmex'].apis[0], 'my-api');
  });

});
