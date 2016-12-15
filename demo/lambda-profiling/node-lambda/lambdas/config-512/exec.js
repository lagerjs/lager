'use strict';

const inspection = require('inspection');

module.exports = function(input, cb) {
  const inspect = inspection();
  console.log(JSON.stringify(inspect));
  cb(null, inspect);
};
