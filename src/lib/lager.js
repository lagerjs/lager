'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const program = require('commander');
const inquirer = require('inquirer');


// Configure error reporting for dev environment
// @TODO use bunyan for logs, including errors
const PrettyError = require('pretty-error');
const pe = new PrettyError();

// To render exceptions thrown in non-promies code:
process.on('uncaughtException', function(error) {
   console.log(pe.render(error));
});

// To render unhandled rejections created in BlueBird:
process.on('unhandledRejection', function(reason) {
   console.log("Unhandled rejection");
   console.log(pe.render(reason));
});

// @TODO Set this configuration for environments
Promise.config({
  warnings: true,
  longStackTraces: true,
  cancellation: true,
  monitoring: true
});


/**
 * Construct the lager instance
 *
 * The lager instance is a singleton that can explore the application configuration
 * give information about it, control it's validity and perform deployment
 *
 * It is possible to register plugins on the lager instance
 * A lager plugin can implements hooks to inject code and modify the behavior of
 * the lager instance
 * A lager plugin can create his own hooks for the lager instance, so it is possible
 * to create plugins for a lager plugin!
 * @constructor
 */
function Lager() {
  this.plugins = [];
}

/**
 * Lager expose it's bluebird dependency, so plugins don't need to add it as a dependency
 */
Lager.prototype.getPromise = function() {
  return Promise;
};

/**
 * Lager expose it's lodash dependency, so plugins don't need to add it as a dependency
 */
Lager.prototype.getLodash = function() {
  return _;
};

/**
 * Lager expose it's commander dependency, so plugins can add their own commands
 */
Lager.prototype.getProgram = function() {
  return program;
};

/**
 * Lager expose it's inquirer dependency, so plugins can add their own command prompt
 */
Lager.prototype.getInquirer = function() {
  return inquirer;
};

/**
 * Add a plugin to the lager instance
 * @param  {Object} plugin
 * @return {Lager}
 */
Lager.prototype.registerPlugin = function(plugin) {
  this.plugins.push(plugin);
  return this;
};

/**
 * Retrieve a plugin by name
 * @param  {string} name
 * @return {Object}
 */
Lager.prototype.getPlugin = function(name) {
  return _.find(this.plugins, plugin => {
    return plugin.name === name;
  });
};

/**
 * Fire a hook/event
 * @param  {string} eventName - the name of the hook
 * @param  {...*} arg - the list of arguments provided to the hook
 * @return {Promise<[]>} return the promise of an array containing the hook's arguments
 *         eventually transformed by plugins
 */
Lager.prototype.fire = function() {
  // Extract arguments and eventName
  let args = Array.prototype.slice.call(arguments);
  let eventName = args.shift();

  // let argsDescription = '(' + _.map(args, arg => {
  //   return !arg ? arg : (arg.toString ? arg.toString() : Object.prototype.toString.call(arg));
  // }).join(', ') + ')';
  // console.log('HOOK ' + eventName + argsDescription);

  // Define a recusive function that will check if a plugin implements the hook,
  // execute it and pass the eventually transformed arguments to the next one
  let callPluginsSequencialy = function callPluginsSequencialy(i, args) {
    if (!this.plugins[i]) {
      // If there is no more plugin to execute, we return a promise of the event arguments/result
      // So we are getting out of the sequencial calls
      return Promise.resolve.call(this, args);
    }

    if (this.plugins[i].hooks && this.plugins[i].hooks[eventName]) {
      // If the plugin implements the hook, then we execute it
      return this.plugins[i].hooks[eventName].apply(this.plugins[i], args)
      .spread(function() {
        // When the plugin hook has been executed, we move to the next plugin (recursivity
        return callPluginsSequencialy.bind(this)(i + 1, arguments);
      }.bind(this));
    }

    // If the plugin does not implement the hook, we move to the next plugin (recursivity)
    return callPluginsSequencialy.bind(this)(i + 1, args);
  };
  // Call the recursive function
  return callPluginsSequencialy.bind(this)(0, args);
};



/******************************************************
 * Add helper functions to the Lager constructor
 ******************************************************/
// @TODO this should be a Lager plugin
/**
 * Take a string as parameter and return a role ARN
 * @type {function}
 */
Lager.prototype.retrieveRoleArn = require('./helper/retrieve-role-arn');


const lager = new Lager();


module.exports = lager;
