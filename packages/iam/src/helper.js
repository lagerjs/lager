'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const AWS = require('aws-sdk');


// We cannot find a policy by name with the AWS SDK (only by ARN)
// Since we do not know the account id of the environment, we have to list
// all local policies and search for the policy name
function getPolicyByName(name, listParams, marker) {
  const iam = new AWS.IAM();
  const params = _.assign({
    Marker: marker,
    MaxItems: 100,
    PathPrefix: '/',
    OnlyAttached: false,
    Scope: 'All'
  }, listParams);
  return Promise.promisify(iam.listPolicies.bind(iam))(params)
  .then(policyList => {
    const policyFound = _.find(policyList.Policies, function(policy) { return policy.PolicyName === name; });
    if (policyFound) {
      return Promise.resolve(policyFound);
    } else if (policyList.IsTruncated) {
      return getPolicyByName(name, listParams, policyList.Marker);
    } else {
      return Promise.resolve(null);
    }
  });
}


/**
 * Retrieve a policy Arn from a identifier that can be either the ARN or the name
 * @param {String} identifier
 * @param {[type]} context
 * @param {[type]} searchParams
 * @returns {[type]}
 */
function retrievePolicyArn(identifier, context, searchParams) {
  if (/arn:aws:iam::\d{12}:policy\/?[a-zA-Z_0-9+=,.@\-_/]+]/.test(identifier)) {
    return Promise.resolve(identifier);
  }

  // @TODO make this code more beautiful
  // Try ENV_PolicyName_stage
  let policyIdentifier = context.environment + '_' + identifier + '_' + context.stage;
  return getPolicyByName(policyIdentifier, searchParams)
  .then(policy => {
    if (!policy) {
      // Try ENV_PolicyName
      policyIdentifier = context.environment + '_' + identifier;
      return getPolicyByName(policyIdentifier, searchParams)
      .then(policy => {
        if (!policy) {
          // Try PolicyName
          return getPolicyByName(identifier, searchParams)
          .then(policy => {
            if (!policy) {
              return findAndDeployPolicy(identifier, context)
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


function retrieveAWSRoles() {
  const iam = new AWS.IAM();
  return Promise.promisify(iam.listRoles.bind(iam))({})
  .then((data) => {
    return data.Roles;
  });
}


/**
 * Takes a role ARN, or a role name as parameter, requests AWS,
 * and retruns the ARN of a role matching the ARN or the role name or the role name with context informations
 * @param  {string} identifier - a role ARN, or a role name
 * @param  {Object} context - an object containing the stage and the environment
 * @return {string} - an AWS role ARN
 */
function retrieveRoleArn(identifier, context) {
  const iam = new AWS.IAM();
  // First check if the parameter already is an ARN
  if (/arn:aws:iam::\d{12}:role\/?[a-zA-Z_0-9+=,.@\-_\/]+/.test(identifier)) {
    return Promise.resolve(identifier);
  }
  // Then, we check if a role exists with a name "ENVIRONMENT_identifier_stage"
  return Promise.promisify(iam.getRole.bind(iam))({ RoleName: context.environment + '_' + identifier + '_' + context.stage })
  .then((data) => {
    return Promise.resolve(data.Role.Arn);
  })
  .catch(e => {
    // If it failed, we check if a role exists with a name "ENVIRONMENT_identifier"
    return Promise.promisify(iam.getRole.bind(iam))({ RoleName: context.environment + '_' + identifier })
    .then((data) => {
      return Promise.resolve(data.Role.Arn);
    })
    .catch(e => {
      // If it failed again, we check if a role exists with a name "identifier"
      return Promise.promisify(iam.getRole.bind(iam))({ RoleName: identifier })
      .then((data) => {
        return Promise.resolve(data.Role.Arn);
      })
      .catch(e => {
        const plugin = require('./index');
        return plugin.findRoles([identifier])
        .then(roles => {
          if (roles.length === 1) {
            return roles[0].deploy(context)
            .then(report => {
              return report.arn;
            });
          }
          return Promise.reject(new Error('Could not find role ' + identifier));
        });
      });
    });
  });
}


function findAndDeployPolicy(identifier, context) {
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
  retrievePolicyArn,
  retrieveAWSRoles,
  retrieveRoleArn
};
