'use strict';

const path = require('path');
const Promise = require('bluebird');
const _ = require('lodash');
const Pebo = require('pebo');
Pebo.setPromise(Promise);

if (process.env.NODE_ENV === 'development') {
  // Configure error reporting for dev environment
  // @TODO use bunyan for logs, including errors
  const PrettyError = require('pretty-error');
  const pe = new PrettyError();

  // To render exceptions thrown in non-promies code:
  process.on('uncaughtException', e => {
    console.log('Uncaught exception');
    console.log(pe.render(e));
  });

  // To render unhandled rejections created in BlueBird:
  process.on('unhandledRejection', r => {
    console.log('Unhandled rejection');
    console.log(pe.render(r));
  });

  Promise.config({
    warnings: true,
    longStackTraces: true,
    cancellation: true,
    monitoring: true
  });
}

class Lager extends Pebo {
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
  constructor() {
    super();
    this.plugins = [];
  }

  /**
   * Add a plugin to the lager instance
   * @param {Object} plugin
   * @returns {Lager}
   */
  registerPlugin(plugin, identifier) {
    if (!plugin.name) { throw new Error('A lager plugin MUST have a name property'); }
    // Lager inject a getPath() method in the plugin
    plugin.getPath = function getBasePath() {
      return path.join(process.cwd(), plugin.name);
    };
    this.plugins.push(plugin);

    // add hooks/event listeners
    plugin.hooks = plugin.hooks || [];
    _.map(plugin.hooks, (fn, event) => {
      this.when(event, fn);
    });
    return this;
  }

  /**
   * Retrieve a plugin by name
   * @param {string} name
   * @returns {Object}
   */
  getPlugin(name) {
    return _.find(this.plugins, plugin => {
      return plugin.name === name;
    });
  }

  /**
   * Initialisation of the Lager instance
   * It looks for a configuration file and register plugins
   * @return {Promise} - a promise that resolves when the initialisation is finished
   */
  init(config) {
    config.plugins = config.plugins || [];

    _.forEach(config.plugins, pluginIdentifier => {
      lager.registerPlugin(require(pluginIdentifier), pluginIdentifier);
    });

    return Promise.resolve();
  }
}

const lager = new Lager();

/**
 * This property allows the lager instance to share some key dependencies with plugins
 * @type {Object}
 */
lager.import = {
  Promise, _
};

module.exports = lager;
