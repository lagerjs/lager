'use strict';

const delay = 35000;
let lastExec = new Date().getTime() - 30000;

module.exports = () => {
  return new Promise(resolve => {
    const now = new Date().getTime();
    const elapsed = now - lastExec;
    if (elapsed > delay) {
      lastExec = now;
      console.log('    Deploy API now');
      resolve();
    } else {
      console.log('    Deploy API in ' + (delay - elapsed) + 'ms');
      setTimeout(() => {
        lastExec = new Date().getTime();
        console.log('    Deploy API now');
        resolve();
      }, delay - elapsed);
    }
  });
};
