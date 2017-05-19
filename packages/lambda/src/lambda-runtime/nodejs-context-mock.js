'use strict';

module.exports = {
  succeed: (res) => {
    console.log('context.succeed() called with the following content:');
    console.log(JSON.stringify(res, 5, 2));
  },
  fail: (e) => {
    if (e instanceof Error) {
      console.log('context.fail() called with the following error:');
      console.log(e);
      console.log(e.stack);
    } else {
      console.log('context.fail() called with the following content:');
      console.log(JSON.stringify(e, 5, 2));
    }
  }
};
