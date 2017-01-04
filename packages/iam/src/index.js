'use strict';


const Promise = require('bluebird');
const _ = require('lodash');
const AWS = require('aws-sdk');

const path = require('path');
const fs = Promise.promisifyAll(require('fs'));

const iam = new AWS.IAM();

/**
 * Load all policy configurations
 * @return {Promise<[Policy]>} - promise of an array of policies
 */
function loadPolicies() {
  const policyConfigsPath = path.join(process.cwd(), plugin.config.policiesPath);

  // This event allows to inject code before loading all APIs
  return plugin.lager.fire('beforePoliciesLoad')
  .then(() => {
    // Retrieve configuration path of all API specifications
    return fs.readdirAsync(policyConfigsPath);
  })
  .then(policyConfigFiles => {
    // Load all the policy configurations
    const policyPromises = [];
    _.forEach(policyConfigFiles, (filename) => {
      const policyConfigPath = path.join(policyConfigsPath, filename);
      const policyName = path.parse(filename).name;
      policyPromises.push(loadPolicy(policyConfigPath, policyName));
    });
    return Promise.all(policyPromises);
  })
  .then(policies => {
    // This event allows to inject code to add or delete or alter policy configurations
    return plugin.lager.fire('afterPoliciesLoad', policies);
  })
  .spread(policies => {
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
 * Load a policy
 * @param {string} documentPath - path to the document file
 * @param {string} name - the policy name
 * @returns {Promise<Policy>} - the promise of a policy
 */
function loadPolicy(documentPath, name) {
  return plugin.lager.fire('beforePolicyLoad', documentPath, name)
  .spread((documentPath, name) => {
    // Because we use require() to get the document, it could either be a JSON file
    // or the content exported by a node module
    // But because require() caches the content it loads, we clone the result to avoid bugs
    // if the function is called twice
    const document = _.cloneDeep(require(documentPath));
    const Policy = require('./policy');
    const policy = new Policy(document, name);

    // This event allows to inject code to alter the Lambda configuration
    return plugin.lager.fire('afterPolicyLoad', policy);
  })
  .spread((policy) => {
    return Promise.resolve(policy);
  });
}

/**
 * Retrieve policies by their identifier
 * @param {Array} identifiers - an array of policy identifiers
 * @return {Promise<[Policy]>} - promise of an array of policies
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
  const roleConfigsPath = path.join(process.cwd(), plugin.config.rolesPath);

  // This event allows to inject code before loading all APIs
  return plugin.lager.fire('beforeRolesLoad')
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
    return plugin.lager.fire('afterRolesLoad', roles);
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
  return plugin.lager.fire('beforeRoleLoad', configPath, name)
  .spread((documentPath, name) => {
    // Because we use require() to get the config, it could either be a JSON file
    // or the content exported by a node module
    // But because require() caches the content it loads, we clone the result to avoid bugs
    // if the function is called twice
    const config = _.cloneDeep(require(configPath));
    const Role = require('./role');
    const role = new Role(config, name);

    // This event allows to inject code to alter the Lambda configuration
    return plugin.lager.fire('afterRoleLoad', role);
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

/**
 * @TODO check duplication with iam/helper.retrieveRoleArn()
 * Takes a role ARN, or a role name as parameter, requests AWS,
 * and retruns the ARN of a role matching the ARN or the role name or the role name with context informations
 * @param  {string} identifier - a role ARN, or a role name
 * @param  {Object} context - an object containing the stage and the environment
 * @return {string} - an AWS role ARN
 */
function retrieveRoleArn(identifier, context) {
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
        // @TODO improve error handling
        return Promise.reject(new Error('Could not find role ' + identifier));
      });
    });
  });
}


const plugin = {
  name: 'iam',

  config: {
    policiesPath: 'iam' + path.sep + 'policies',
    rolesPath: 'iam' + path.sep + 'roles'
  },

  hooks: {
    /**
     * Hooks that add new commands to the Lager CLI
     * @returns {Promise}
     */
    registerCommands: function registerCommands(icli) {
      return Promise.all([
        require('./cli/create-policy')(icli),
        require('./cli/create-role')(icli),
        require('./cli/deploy-policies')(icli),
        require('./cli/deploy-roles')(icli)
      ])
      .then(() => {
        return Promise.resolve([]);
      });
    },
  },

  extensions: {
    getRoles: loadRoles,
    retrieveRoleArn: retrieveRoleArn
  },

  loadPolicies,
  findPolicies,
  loadRoles,
  findRoles,
  retrieveRoleArn
};

module.exports = plugin;
