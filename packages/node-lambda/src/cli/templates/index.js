'use strict';

const fn = require('./exec.js');

module.exports.handler = function(event, context, cb) {
  fn(event, cb);
};
