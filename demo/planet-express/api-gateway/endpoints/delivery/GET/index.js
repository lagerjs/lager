'use strict';

/**
 * This file will be loaded by a Lambda.
 * From here you can require whatever node module that is embed in the Lambda
 */

module.exports = (input, cb) => {
  const output = {
    message: 'This function will be called by Lambda.',
    input
  };
  console.log(output);
  cb(null, output);
};
