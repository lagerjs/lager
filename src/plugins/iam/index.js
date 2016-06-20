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
 * @param {[type]} documentPath [description]
 * @param {[type]} name         [description]
 * @returns {[type]}              [description]
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

/**
 * [findPolicies description]
 * @param {[type]} identifiers [description]
 * @returns {[type]}             [description]
 */
function findPolicies(identifiers) {
  return loadPolicies()
  .then((policies) => {
    return _.filter(policies, (policy) => { return identifiers.indexOf(policy.name) !== -1; });
  });
}

/**
 * [loadRoles description]
 * @returns {[type]} [description]
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
 * @param {[type]} configPath [description]
 * @param {[type]} name       [description]
 * @returns {[type]}            [description]
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
 * @param {[type]} identifiers [description]
 * @returns {[type]}            [description]
 */
function findRoles(identifiers) {
  return loadRoles()
  .then((roles) => {
    return _.filter(roles, (role) => { return identifiers.indexOf(role.name) !== -1; });
  });
}

module.exports = {
  name: 'iam',

  hooks: {
    /**
     * [registerCommands description]
     * @returns {[type]}          [description]
     */
    registerCommands: function registerCommands() {
      return Promise.all([
        require('./cli/create-policy')(),
        require('./cli/create-role')(),
        require('./cli/deploy-policies')(),
        require('./cli/deploy-roles')()
      ])
      .then(() => {
        return Promise.resolve([]);
      });
    },

    /**
     * This hook load all role and policy configurations
     * @returns {Boolean}
     */
    beforeApisLoad: function beforeApisLoad() {
      return loadPolicies()
      .then((loadedPolicies) => {
        return loadRoles();
      })
      .then((loadedRoles) => {
        return Promise.resolve([]);
      });
    }
  },

  loadPolicies,
  findPolicies,
  loadRoles,
  findRoles
};
