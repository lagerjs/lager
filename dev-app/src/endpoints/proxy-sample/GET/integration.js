'use strict';

/**
 * This function allows to modify the swagger specification
 * @param  {Object}   specification
 * @param  {Function} cb
 */
module.exports = function(specification, cb) {

  // This example is very simple but we could imagine more complex rules
  // to dynamicaly set the uri during the deployment
  specification['x-amazon-apigateway-integration'].uri = 'http://www.example.com/',
  cb(null, specification);

};
