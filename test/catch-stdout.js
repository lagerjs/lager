'use strict';

let catched = '';
let originalWrite;

module.exports.start = (execOriginal) => {
  catched = '';
  originalWrite = process.stdout.write;
  process.stdout.write = function(string, encoding, fd) {
    if (execOriginal) {
      originalWrite.apply(process.stdout, arguments);
    }
    catched += string;
  };
};

module.exports.stop = () => {
  process.stdout.write = originalWrite;
  return catched;
};
