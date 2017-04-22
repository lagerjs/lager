'use strict';

const _ = require('lodash');

const plugin = require('./index');

/**
 * The specification of an API model
 * @param {Object} spec - Swagger/OpenAPI specification of the model
 * @constructor
 */
const Model = function Model(name, spec) {
  this.name = name;
  this.spec = spec;
};

/**
 * Returns a string representation of an Model instance
 * @returns {string} - a string representation of an model instance
 */
Model.prototype.toString = function toString() {
  return 'Model ' + this.name;
};

/**
 * Returns the name of the Model
 * @returns {string}
 */
Model.prototype.getName = function getName(type) {
  if (type === 'spec') {
    return _.upperFirst(_.camelCase(this.name));
  }
  return this.name;
};

/**
 * Returns the model's Swagger/OpenAPI specification
 * @returns {Object} - a portion of Swagger/OpenAPI specification describing the model
 */
Model.prototype.getSpec = function getSpec() {
  return this.spec;
};

/**
 * Returns the child modlels
 * @returns {Array<Models>}
 */
Model.prototype.getChildModels = function getChildModels() {
  const modelRefs = [];
  if (this.spec.properties) {
    _.forEach(this.spec.properties, property => {
      if (property.$ref) {
        modelRefs.push(property.$ref);
      }
    });
  }
  const modelNames = _.map(_.uniq(modelRefs), modelRef => {
    return modelRef.replace('#/definitions/', '');
  });

  return Promise.map(modelNames, modelName => {
    return plugin.findModel(modelName);
  });
};

/**
 * Return the list of nested models
 * @return {Object}
 */
Model.prototype.getNestedModelsList = function getNestedModelsList() {
  return this.getChildModels()
  .then(models => {
    // Shortcut if the model does not have any child, we set the result to an empty list
    if (models.length === 0) {
      return Promise.resolve({});
    }
    // If the model has children
    return Promise.map(models, childModel => {
      // Recusivity: whe call the getNestedModelsList() of child models
      // The recursion will stop when a model does not have any child
      return Promise.all([childModel, childModel.getNestedModelsList()])
      .spread((childModel, nestedModelsList) => {
        // We add the child model itself to the list of its dependencies
        nestedModelsList.push(childModel);
        return nestedModelsList;
      });
    });
  })
  .then(nestedModelsLists => {
    // At this point, we have a list of lists, we merge them
    return Promise.resolve(_.concat.apply(null, nestedModelsLists));
  });
};

module.exports = Model;
