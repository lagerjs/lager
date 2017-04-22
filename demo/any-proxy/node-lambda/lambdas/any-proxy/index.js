'use strict';

module.exports.handler = function(event, context, cb) {
  cb(null, {
    statusCode: 200,
    headers: {},
    body: JSON.stringify({
      msg: 'This Lambda is not implemented yet',
      event: event
    })
  });
};
