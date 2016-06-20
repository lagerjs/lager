'use strict';

var fn = require('./router.js');

exports.handler = function(event, context) {
  fn(event, context.done);
};
