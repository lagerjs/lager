'use strict';

const inspection = require('inspection');

module.exports.handler = function(event, context, cb) {
  const inspect = inspection();
  cb(null, inspect);
};
