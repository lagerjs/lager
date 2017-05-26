'use strict';

const path = require('path');
const bunyan = require('bunyan');
const eol = require('os').EOL;

const stderrStream = {
  level: 'warn',
  type: 'raw',
  stream: {
    write: (obj) => {
      if (obj.err && obj.err.code && obj.err.message) {
        process.stderr.write(eol + obj.err.code + eol + obj.err.message + eol);
      } else if (obj.promise && obj.reason && obj.reason.code) {
        process.stderr.write(eol + obj.reason.code + eol + JSON.stringify(obj.reason, null, 2) + eol);
      } else {
        process.stderr.write(eol + JSON.stringify(obj, null, 2) + eol);
      }
      process.stderr.write(eol + 'More information in myrmex.log' + eol);
    }
  }
};

const fileStream = {
  level: 'debug',
  path: path.join(process.cwd(), 'myrmex.log')
};

const log = bunyan.createLogger({
  name: 'myrmex',
  streams: [stderrStream, fileStream],
  src: false
});

module.exports = log;
