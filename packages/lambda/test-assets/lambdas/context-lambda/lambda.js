'use strict';

module.exports.handler = function(event, context, cb) {
  if (event.success) {
    context.succeed('A successful Lambda execution');
  } else {
    context.fail(new Error('An error should occur here'));
  }
};
