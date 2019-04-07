'use strict';

module.exports.handler = function(event) {
  console.log('Async Lambda');
  return event.success ? Promise.resolve('Async Lambda Success') : Promise.reject('Async Lambda Error');
};
