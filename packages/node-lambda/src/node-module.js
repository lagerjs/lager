'use strict';

const Promise = require('bluebird');
const _ = require('lodash');

const plugin = require('./index');

/**
 * Constructor function
 * @param {Object} packageJson - the content of a package.json file
 * @param {string} name - the name of the module
 * @param {string} path - the fsPath to the module on the filesystem
 * @constructor
 */
const NodeModule = function NodeModule(packageJson, name, fsPath) {
  this.packageJson = packageJson;
  this.name = name;
  this.fsPath = fsPath;
};

/**
 * Returns the Module name
 * @returns {string}
 */
NodeModule.prototype.getName = function getName() {
  return this.name;
};

/**
 * Returns the module location on the file system
 * @returns {string}
 */
NodeModule.prototype.getFsPath = function getFsPath() {
  return this.fsPath;
};

/**
 * Returns the module dependencies
 * Its it the dependencies to other modules that we have to include in the Lambda
 * not "normal" dependencies that we find in node_modules
 * @returns {Array}
 */
NodeModule.prototype.getDependencies = function getDependencies() {
  let moduleDependencies = [];
  if (this.packageJson['x-lager'] && this.packageJson['x-lager'].dependencies) {
    moduleDependencies = this.packageJson['x-lager'].dependencies;
  }
  return moduleDependencies;
};

/**
 * Return the list of nested child modules
 * @return {Object}
 */
NodeModule.prototype.getNestedDependenciesList = function getNestedDependenciesList() {
  const dependencies = this.getDependencies();

  // Shortcut if the module does not have any dependency, we set the result to an empty list
  if (dependencies.length === 0) {
    return Promise.resolve({});
  }

  // If the module has dependencies, the full module list is the list of nested child modules
  return Promise.map(dependencies, moduleName => {
    return plugin.findNodeModule(moduleName)
    .then(childModule => {
      // Recusivity: whe call the getNestedDependenciesList() of child modules
      // The recursion will stop when a module does not have any dependency
      return Promise.all([childModule, childModule.getNestedDependenciesList()]);
    })
    .spread((childModule, childDependenciesList) => {
      // We add the child module itself to the list of its dependencies
      childDependenciesList[childModule.getName()] = childModule;
      return childDependenciesList;
    });
  })
  .then(moduleLists => {
    // At this point, we have a list of lists, we merge them
    return Promise.resolve(_.assign.apply(null, moduleLists));
  });
};

module.exports = NodeModule;
