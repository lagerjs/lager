'use strict';

/**
 * A constructor that implements integrationDataInjector to inject data from the lambda deployment
 * in the configuration of endpoints that integrate with it
 * @param {Lambda} lambdaData - data returned from the deployment of a lambda
 * @constructor
 */
let LambdaIntegrationDataInjector = function LambdaIntegrationDataInjector(lambdaData) {
  this.lambdaData = lambdaData;
};

/**
 * Implementation of an integrationDataInjector
 * Take an endpoint as parameter and update it's configuration with the lambda's data
 * @param  {Endpoint} endpoint
 * @return {Endpoint}
 */
LambdaIntegrationDataInjector.prototype.applyToEndpoint = function applyToEndpoint(endpoint) {
  let spec = endpoint.getSpec();

  // The integrationDataInjector applies if the endpoint spec refers to its lambda
  if (spec['x-lager'] && spec['x-lager'].lambda && spec['x-lager'].lambda === this.lambdaData.FunctionName) {
    spec['x-amazon-apigateway-integration'].type = 'aws';
    spec['x-amazon-apigateway-integration'].uri = 'arn:aws:apigateway:'
                                                + this.lambdaData.FunctionArn.split(':')[3]
                                                + ':lambda:path/2015-03-31/functions/'
                                                + this.lambdaData.FunctionArn
                                                + '/invocations';
  }
  return endpoint;
};

module.exports = LambdaIntegrationDataInjector;
