'use strict';

const Promise = require('bluebird');
const AWS = require('aws-sdk');

let iam = new AWS.IAM();

/* istanbul ignore next */
/**
 * Retrieve a role Arn from a identifier that can be either the ARN or the name
 * @param  {string} identifier - The name or the ARN of the role
 * @return {Promise<string>}
 */
module.exports = function retrieveRoleArn(identifier, environment) {
  // First check if the parameter already is an ARN
  if (/arn:aws:iam::\d{12}:role\/?[a-zA-Z_0-9+=,.@\-_/]+]/.test(identifier)) {
    return Promise.resolve(identifier);
  }

  // Then, we check if a role exists with this name
  return Promise.promisify(iam.getRole.bind(iam))({ RoleName: identifier })
  .then((data) => {
    return Promise.resolve(data.Role.Arn);
  })
  .catch((e) => {
    // If it failed, we try with the environment as prefix
    return Promise.promisify(iam.getRole.bind(iam))({ RoleName: environment + '_' + identifier })
    .then((data) => {
      return Promise.resolve(data.Role.Arn);
    });
  });
};
