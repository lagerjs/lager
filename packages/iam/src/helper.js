'use strict';

const Promise = require('bluebird');
const _ = require('lodash');

// We cannot find a policy by name with the AWS SDK (only by ARN)
// Since we do not know the account id of the environment, we have to list
// all local policies and search for the policy name
function getPolicyByName(awsIAM, name, listParams, marker) {
  const params = _.assign({
    Marker: marker,
    MaxItems: 100,
    PathPrefix: '/',
    OnlyAttached: false,
    Scope: 'All'
  }, listParams);
  return Promise.promisify(awsIAM.listPolicies.bind(awsIAM))(params)
  .then(policyList => {
    //console.log(policyList);
    const policyFound = _.find(policyList.Policies, function(policy) { return policy.PolicyName === name; });
    if (policyFound) {
      return Promise.resolve(policyFound);
    } else if (policyList.IsTruncated) {
      return getPolicyByName(awsIAM, name, listParams, policyList.Marker);
    } else {
      return Promise.resolve(null);
    }
  });
}


/* istanbul ignore next */
/**
 * Retrieve a policy Arn from a identifier that can be either the ARN or the name
 * @param {[type]} awsIAM       [description]
 * @param {String} identifier - The name or the ARN of the role
 * @param {[type]} context      [description]
 * @param {[type]} searchParams [description]
 * @returns {[type]}              [description]
 */
function retrievePolicyArn(awsIAM, identifier, context, searchParams) {
  if (/arn:aws:iam::\d{12}:policy\/?[a-zA-Z_0-9+=,.@\-_/]+]/.test(identifier)) {
    return Promise.resolve(identifier);
  }

  // @TODO make this code more beautiful
  // Try ENV_PolicyName_stage
  let policyIdentifier = context.environment + '_' + identifier + '_' + context.stage;
  return getPolicyByName(awsIAM, policyIdentifier, searchParams)
  .then(policy => {
    if (!policy) {
      // Try ENV_PolicyName
      policyIdentifier = context.environment + '_' + identifier;
      return getPolicyByName(awsIAM, policyIdentifier, searchParams)
      .then(policy => {
        if (!policy) {
          // Try PolicyName
          return getPolicyByName(awsIAM, identifier, searchParams)
          .then(policy => {
            if (!policy) {
              throw new Error('The policy ' + identifier + ' does not exist.');
            }
            return policy;
          });
        }
        return policy;
      });
    }
    return policy;
  })
  .then(policy => {
    return policy.Arn;
  });
}

/**
 * Search for an AWS role by name and return null if not found
 * @param {[type]} awsIAM [description]
 * @param {[type]} name   [description]
 * @returns {[type]}        [description]
 */
function getAwsRole(awsIAM, name) {
  return Promise.promisify(awsIAM.getRole.bind(awsIAM))({ RoleName: name })
  .catch((e) => {
    if (e.code === 'NoSuchEntity') {
      return Promise.resolve();
    }
    throw e;
  });
}

module.exports = {
  getPolicyByName,
  retrievePolicyArn,
  getAwsRole
};
