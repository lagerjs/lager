'use strict';

// This node package should implement data access

const log = require('log');

module.exports = {
  get(id) {
    log('Call getData(' + id + ')');
    return {
      id: id,
      content: 'fake'
    };
  }
};
