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
  cb(null, {
    msg: 'This Lambda is not implemented!',
    input: input
  });
};
