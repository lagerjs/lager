'use strict';

const path = require('path');
const bunyan = require('bunyan');

const stdoutStream = {
  level: 'warn',
  stream: process.stdout
};

const fileStream = {
  level: 'debug',
  path: path.join(process.cwd(), 'lager.log')
};

const log = bunyan.createLogger({
  name: 'city-voices',
  streams: [stdoutStream, fileStream],
  src: false
});

module.exports = log;
