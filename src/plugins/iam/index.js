'use strict';

const path = require('path');
const lager = require('@lager/lager/lib/lager');
const Promise = lager.getPromise();
const fs = Promise.promisifyAll(require('fs'));
const _ = require('lodash');

const Policy = require('./policy');
const Role = require('./role');

function loadPolicies() {
  const policyConfigsPath = path.join(process.cwd(), 'iam', 'policies');

  // This event allows to inject code before loading all APIs
  return lager.fire('beforePoliciesLoad')
  .then(() => {
    // Retrieve configuration path of all API specifications
    return fs.readdirAsync(policyConfigsPath);
  })
  .then((policyConfigFiles) => {
    // Load all the policy configurations
    const policyPromises = [];
    _.forEach(policyConfigFiles, (filename) => {
      const policyConfigPath = path.join(policyConfigsPath, filename);
      const policyName = path.parse(filename).name;
      policyPromises.push(loadPolicy(policyConfigPath, policyName));
    });
    return Promise.all(policyPromises);
  })
  .then((policies) => {
    // This event allows to inject code to add or delete or alter policy configurations
    return lager.fire('afterPoliciesLoad', policies);
  })
  .spread((policies) => {
    return Promise.resolve(policies);
  })
  .catch(e => {
    if (e.code === 'ENOENT' && path.basename(e.path) === 'policies') {
      return Promise.resolve([]);
    }
    return Promise.reject(e);
  });
}

/**
 * [loadPolicy description]
 * @param  {[type]} documentPath [description]
 * @param  {[type]} name         [description]
 * @return {[type]}              [description]
 */
function loadPolicy(documentPath, name) {
  return lager.fire('beforePolicyLoad', documentPath, name)
  .spread((documentPath, name) => {
    // Because we use require() to get the document, it could either be a JSON file
    // or the content exported by a node module
    // But because require() caches the content it loads, we clone the result to avoid bugs
    // if the function is called twice
    const document = _.cloneDeep(require(documentPath));
    const policy = new Policy(document, name);

    // This event allows to inject code to alter the Lambda configuration
    return lager.fire('afterPolicyLoad', policy);
  })
  .spread((policy) => {
    return Promise.resolve(policy);
  });
}

function findPolicy(identifier) {
  return loadPolicies()
  .then((policies) => {
    return _.find(policies, (policy) => { return policy.name === identifier; });
  });
}

/**
 * [loadRoles description]
 * @return {[type]} [description]
 */
function loadRoles() {
  const roleConfigsPath = path.join(process.cwd(), 'iam', 'roles');

  // This event allows to inject code before loading all APIs
  return lager.fire('beforeRolesLoad')
  .then(() => {
    // Retrieve configuration path of all API specifications
    return fs.readdirAsync(roleConfigsPath);
  })
  .then((roleConfigFiles) => {
    // Load all the role configurations
    const rolePromises = [];
    _.forEach(roleConfigFiles, (filename) => {
      const roleConfigPath = path.join(roleConfigsPath, filename);
      const roleName = path.parse(filename).name;
      rolePromises.push(loadRole(roleConfigPath, roleName));
    });
    return Promise.all(rolePromises);
  })
  .then((roles) => {
    // This event allows to inject code to add or delete or alter role configurations
    return lager.fire('afterRolesLoad', roles);
  })
  .spread((roles) => {
    return Promise.resolve(roles);
  })
  .catch(e => {
    if (e.code === 'ENOENT' && path.basename(e.path) === 'roles') {
      return Promise.resolve([]);
    }
    return Promise.reject(e);
  });
}

/**
 * [loadRole description]
 * @param  {[type]} configPath [description]
 * @param  {[type]} name       [description]
 * @return {[type]}            [description]
 */
function loadRole(configPath, name) {
  return lager.fire('beforeRoleLoad', configPath, name)
  .spread((documentPath, name) => {
    // Because we use require() to get the config, it could either be a JSON file
    // or the content exported by a node module
    // But because require() caches the content it loads, we clone the result to avoid bugs
    // if the function is called twice
    const config = _.cloneDeep(require(configPath));
    const role = new Role(config, name);

    // This event allows to inject code to alter the Lambda configuration
    return lager.fire('afterRoleLoad', role);
  })
  .spread((role) => {
    return Promise.resolve(role);
  });
}

/**
 * [findRole description]
 * @param  {[type]} identifier [description]
 * @return {[type]}            [description]
 */
function findRole(identifier) {
  return loadRoles()
  .then((roles) => {
    return _.find(roles, (role) => { return role.name === identifier; });
  });
}

module.exports = {
  name: 'iam',

  hooks: {
    /**
     * [registerCommands description]
     * @param  {[type]} program  [description]
     * @param  {[type]} inquirer [description]
     * @return {[type]}          [description]
     */
    registerCommands: function registerCommands(program, inquirer) {
      return Promise.all([
        require('./cli/create-policy')(program, inquirer),
        require('./cli/create-role')(program, inquirer),
        require('./cli/deploy-policy')(program, inquirer),
        require('./cli/deploy-role')(program, inquirer)
      ])
      .then(() => {
        return Promise.resolve([program, inquirer]);
      });
    },

    /**
     * This hook load all role and policy configurations
     * @return {Boolean}
     */
    beforeApisLoad: function beforeApisLoad() {
      return loadPolicies()
      .then((loadedPolicies) => {
        policies = loadedPolicies;
        return loadRoles();
      })
      .then((loadedRoles) => {
        roles = loadedRoles;
        return Promise.resolve([]);
      });
    }
  },

  loadPolicies,
  findPolicy,
  loadRoles,
  findRole
};
