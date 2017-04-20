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


/**
 * Retrieve a policy Arn from a identifier that can be either the ARN or the name
 * @param {[type]} awsIAM
 * @param {String} identifier
 * @param {[type]} context
 * @param {[type]} searchParams
 * @returns {[type]}
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
              return findAndDeployPolicy(identifier, context, awsIAM)
              .then(report => {
                if (!report) {
                  throw new Error('The policy ' + identifier + ' could not be found.');
                }
                return { Arn: report.arn };
              });
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

function findAndDeployPolicy(identifier, context, awsIAM) {
  const plugin = require('./index');
  return plugin.findPolicies([identifier])
  .then(policies => {
    if (policies.length === 0) {
      return null;
    }
    return policies[0].deploy(context);
  });
}

module.exports = {
  getPolicyByName,
  retrievePolicyArn
};
