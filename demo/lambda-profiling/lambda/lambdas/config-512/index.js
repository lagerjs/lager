
'use strict';

const inspection = require('inspection');

module.exports.handler = function(event, context, cb) {
  const inspect = inspection();
  console.log(JSON.stringify(inspect));
  cb(null, inspect);
};
