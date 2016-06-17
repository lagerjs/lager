'use strict';

const lager = require('@lager/lager/lib/lager');
const Promise = lager.getPromise();
const AWS = require('aws-sdk');
const iamHelper = require('./helper');

/**
 * Constructor function
 * @param {[type]} config     [description]
 * @param {[type]} name       [description]
 * @param {[type]} pathPrefix [description]
 */
let Role = function Role(config, name, pathPrefix) {
  this.config = config;
  this.name = name;
  this.pathPrefix = pathPrefix || '/';
};

/**
 * [deploy description]
 * @param {[type]} stage       [description]
 * @param {[type]} environment [description]
 * @returns{[type]}             [description]
 */
Role.prototype.deploy = function deploy(stage, environment) {
  const awsIAM = new AWS.IAM();
  const name = this.name;

  return iamHelper.getAwsRole(awsIAM, name)
  .then((data) => {
    if (data) {
      // If the function already exists
      console.log('   * The role ' + name + ' already exists');
      return this.update(awsIAM, data.Role);
    } else {
      // If error occured because the function does not exists, we create it
      console.log('   * The role ' + name + ' does not exists');
      return this.create(awsIAM, name);
    }
  })
  .then((data) => {
    return this.attachPolicies(awsIAM, name);
  });
};

/**
 * [create description]
 * @param {[type]} awsIAM [description]
 * @param {[type]} name   [description]
 * @returns{[type]}        [description]
 */
Role.prototype.create = function create(awsIAM, name) {
  console.log(' * Create role ' + name);
  var params = {
    AssumeRolePolicyDocument: JSON.stringify(this.config['trust-relationship']),
    RoleName: name,
    Path: this.pathPrefix
  };
  return Promise.promisify(awsIAM.createRole.bind(awsIAM))(params);
};

/**
 * [update description]
 * @param {[type]} awsIAM      [description]
 * @param {[type]} currentRole [description]
 * @returns{[type]}             [description]
 */
Role.prototype.update = function update(awsIAM, currentRole) {
  console.log(' * Update role ' + currentRole.RoleName);
  var params = {
    PolicyDocument: JSON.stringify(this.config['trust-relationship']),
    RoleName: currentRole.RoleName
  };
  return Promise.promisify(awsIAM.updateAssumeRolePolicy.bind(awsIAM))(params);
};

/**
 * [attachPolicies description]
 * @param {[type]} name        [description]
 * @param {[type]} config      [description]
 * @param {[type]} environment [description]
 * @returns{[type]}             [description]
 */
Role.prototype.attachPolicies = function attachPolicies(awsIAM, roleName, environment) {
  // Run the functions in serie
  return Promise.mapSeries(this.config['managed-policies'], (policyIdentifier) => {
    return this.attachManagedPolicy(awsIAM, policyIdentifier, roleName, environment);
  });
};

/**
 * [attachManagedPolicy description]
 * @param {String} roleName         Role name
 * @param {String} policyIdentifier Name or arn
 * @returnsPromise
 */
Role.prototype.attachManagedPolicy = function attachManagedPolicy(awsIAM, policyIdentifier, roleName, environment) {
  const searchParams = {
    OnlyAttached: false,
    Scope: 'All'
  };
  return iamHelper.retrievePolicyArn(awsIAM, policyIdentifier, environment, searchParams)
  .then(function(policyArn) {
    var params = {
      PolicyArn: policyArn,
      RoleName: roleName
    };
    return Promise.promisify(awsIAM.attachRolePolicy.bind(awsIAM))(params);
  });
};

module.exports = Role;
