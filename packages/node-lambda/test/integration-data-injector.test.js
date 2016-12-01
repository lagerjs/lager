/*eslint-env mocha */
/* global testRequire */
'use strict';

const assert = require('assert');
const Lambda = testRequire('src/lambda');
const IntegrationDataInjector = testRequire('src/integration-data-injector');

describe('The integration data injector', () => {

  let lambda;
  let awsLambdaData;

  before(() => {
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
    awsLambdaData = {
      AliasArn: 'arn:aws:lambda:us-east-1:123456789012:function:DEV-my-lambda:v0'
    };
  });

  it('should alter an API Gateway endpoint specification if it correspond to the lambda', () => {
    const injector = new IntegrationDataInjector(lambda, awsLambdaData);

    const fakeEndpoint = {
      spec: {
        'x-lager': {
          lambda: 'MyLambda'
        }
      },
      getSpec: function() {
        return this.spec;
      }
    };

    injector.applyToEndpoint(fakeEndpoint);
    const expected = {
      'x-lager': {
        lambda: 'MyLambda'
      },
      'x-amazon-apigateway-integration': {
        type: 'aws',
        uri: 'arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:123456789012:function:DEV-my-lambda:v0/invocations',
        httpMethod: 'POST',
        responses: {
          default: {
            statusCode: 200
          }
        }
      }
    };
    assert.equal(JSON.stringify(fakeEndpoint.getSpec()), JSON.stringify(expected));
  });

  it('should NOT alter an API Gateway endpoint specification if it DOES NOT correspond to the lambda', () => {
    const injector = new IntegrationDataInjector(lambda, awsLambdaData);

    const fakeEndpoint = {
      spec: {
        'x-lager': {
          lambda: 'AnotherLambda'
        }
      },
      getSpec: function() {
        return this.spec;
      }
    };

    injector.applyToEndpoint(fakeEndpoint);
    const expected = {
      'x-lager': {
        lambda: 'AnotherLambda'
      }
    };
    assert.equal(JSON.stringify(fakeEndpoint.getSpec()), JSON.stringify(expected));
  });


});
