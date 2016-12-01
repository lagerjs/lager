'use strict';

/**
 * A constructor that implements integrationDataInjector to inject data from the lambda deployment
 * in the configuration of endpoints that integrate with it
 * @param {Lambda} lambdaData - data returned from the deployment of a lambda
 * @constructor
 */
const LambdaIntegrationDataInjector = function LambdaIntegrationDataInjector(lambda, awsLambdaData) {
  this.lambda = lambda;
  this.awsLambdaData = awsLambdaData;
};

/**
 * Implementation of an integrationDataInjector
 * Take an endpoint as parameter and update it's configuration with the lambda's data
 * @param {Endpoint} endpoint
 * @returns {Endpoint}
 */
LambdaIntegrationDataInjector.prototype.applyToEndpoint = function applyToEndpoint(endpoint) {
  const spec = endpoint.getSpec();

  // The integrationDataInjector applies if the endpoint spec refers to its lambda
  if (spec['x-lager'] && spec['x-lager'].lambda && spec['x-lager'].lambda === this.lambda.getIdentifier()) {
    spec['x-amazon-apigateway-integration'] = spec['x-amazon-apigateway-integration'] || {};
    spec['x-amazon-apigateway-integration'].type = 'aws';
    spec['x-amazon-apigateway-integration'].uri = 'arn:aws:apigateway:'
                                                + this.awsLambdaData.AliasArn.split(':')[3]
                                                + ':lambda:path/2015-03-31/functions/'
                                                + this.awsLambdaData.AliasArn
                                                + '/invocations';
    spec['x-amazon-apigateway-integration'].httpMethod = 'POST';
    spec['x-amazon-apigateway-integration'].responses = {
      default: {
        statusCode: 200
      }
    };
  }
  return endpoint;
};

module.exports = LambdaIntegrationDataInjector;
