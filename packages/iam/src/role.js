'use strict';

const Promise = require('bluebird');
const AWS = require('aws-sdk');

const iamHelper = require('./helper');
const plugin = require('./index');

/**
 * Constructor function
 * @param {[type]} config     [description]
 * @param {[type]} name       [description]
 * @param {[type]} pathPrefix [description]
 */
const Role = function Role(config, name, pathPrefix) {
  this.config = config;
  this.name = name;
  this.pathPrefix = pathPrefix || '/';
};

/**
 * Returns the name of the role
 * @return {string} - the role name
 */
Role.prototype.getName = function getName() {
  return this.name;
};


/**
 * Returns the name of the role
 * @return {string} - the role name
 */
Role.prototype.getDescription = function getDescription() {
  return this.config.description;
};

/**
 * Deploy the role in AWS
 * @param {Object} context - an object containing the stage and the environment of the role
 * @returns {Promise} - a promise that resolve after the deployment
 */
Role.prototype.deploy = function deploy(context) {
  const awsIAM = new AWS.IAM();
  let name = this.name;
  if (context.environment) {
    name = context.environment + '_' + name;
  }
  if (context.stage) {
    name = name + '_' + context.stage;
  }

  return plugin.lager.fire('beforeDeployRole', this)
  .spread(() => {
    return iamHelper.getAwsRole(awsIAM, name);
  })
  .then(data => {
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
  .then(data => {
    // @TODO allow to detach policies
    return this.attachPolicies(awsIAM, name, context);
  })
  .then(data => {
    console.log('   * Role ' + name + ' deployed');
    return plugin.lager.fire('afterDeployPolicy', this);
  })
  .spread(() => {
    return Promise.resolve(this);
  });

};

/**
 * [create description]
 * @param {[type]} awsIAM [description]
 * @param {[type]} name   [description]
 * @returns {[type]}        [description]
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
 * @returns {[type]}             [description]
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
 * @param {[type]} context     [description]
 * @returns {[type]}           [description]
 */
Role.prototype.attachPolicies = function attachPolicies(awsIAM, roleName, context) {
  // Run the functions in serie
  return Promise.mapSeries(this.config['managed-policies'], (policyIdentifier) => {
    return this.attachManagedPolicy(awsIAM, policyIdentifier, roleName, context);
  });
};

/**
 * [attachManagedPolicy description]
 * @param {String} roleName         Role name
 * @param {String} policyIdentifier Name or arn
 * @returnsPromise
 */
Role.prototype.attachManagedPolicy = function attachManagedPolicy(awsIAM, policyIdentifier, roleName, context) {
  const searchParams = {
    OnlyAttached: false,
    Scope: 'All'
  };
  return iamHelper.retrievePolicyArn(awsIAM, policyIdentifier, context, searchParams)
  .then(policyArn => {
    var params = {
      PolicyArn: policyArn,
      RoleName: roleName
    };
    return Promise.promisify(awsIAM.attachRolePolicy.bind(awsIAM))(params);
  });
};

module.exports = Role;
