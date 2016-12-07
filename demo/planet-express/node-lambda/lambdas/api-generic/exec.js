'use strict';

/**
 * This handler is able to call node modules located in endpoint directories from the api-gateway plugin
 * The template request of endpoints that integrate the Lambda MUST contain this minimal configuration:
 * {
 * 	 "endpoint": {
 * 	   "path": "$context.resourcePath",
 * 	   "method": "$context.httpMethod"
 * 	 }
 * }
 * So this function will be able to find which endpoint/node_module must be executed
 */

module.exports = function(input, cb) {
  if (!input.context || !input.context['resource-path'] || !input.context['http-method']) {
    return cb(new Error('The API Gateway endpoint integration request is not properly configured to call this Lambda function'));
  }
  const fn = require('endpoints' + input.context['resource-path'] + '/' + input.context['http-method']);
  fn(input, cb);
};
