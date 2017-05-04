'use strict';

const dataAccess = require('data-access');

module.exports.handler = function(event, context, cb) {
  const data = dataAccess.get(event.id);
  cb(null, data);
};
