'use strict';

const path = require('path');
const bunyan = require('bunyan');
const eol = require('os').EOL;

const stderrStream = {
  level: 'warn',
  type: 'raw',
  stream: {
    write: (obj) => {
      if (obj.err.code && obj.err.message) {
        process.stderr.write(eol + obj.err.code + eol + obj.err.message + eol);
        process.stderr.write(eol + 'More information in lager.log' + eol);
      }
    }
  }
};

const fileStream = {
  level: 'debug',
  path: path.join(process.cwd(), 'lager.log')
};

const log = bunyan.createLogger({
  name: 'lager',
  streams: [stderrStream, fileStream],
  src: false
});

module.exports = log;
