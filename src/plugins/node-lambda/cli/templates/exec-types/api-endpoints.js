'use strict';

module.exports = function(input, context, cb) {
  const fn = require('./endpoints' + input.endpoint.path + '/' + input.endpoint.method);
  fn(input, cb);
};
