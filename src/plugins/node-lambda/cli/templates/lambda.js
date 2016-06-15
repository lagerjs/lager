'use strict';

var fn = require('./exec.js');

exports.handler = function(event, context, cb) {
  fn(event, context, cb);
};
