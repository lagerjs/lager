'use strict';

module.exports = function(input, cb) {
  var fn = require('./endpoints' + input.endpoint.path + '/' + input.endpoint.method);
  fn(input, cb);
};
