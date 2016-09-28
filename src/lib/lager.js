'use strict';

const path = require('path');
const Promise = require('bluebird');
const _ = require('lodash');
const Pebo = require('pebo');
Pebo.setPromise(Promise);

/**
 * Lager singleton definition
 *
 * The instance will register plugins and emit events
 * It is an Pebo event emitter
 */
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
    this.registerPlugin(require('./core-plugin'));
  }

  /**
   * Add a plugin to the lager instance
   * @param {Object} plugin
   * @returns {Lager}
   */
  registerPlugin(plugin) {
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
    const plugin = _.find(this.plugins, plugin => {
      return plugin.name === name;
    });
    if (!plugin) {
      throw new Error('The plugin "' + name + '" is not registered in the Lager instance');
    }
    return plugin;
  }

  /**
   * Initialisation of the Lager instance
   * It looks for a configuration file and register plugins
   * @return {Promise} - a promise that resolves when the initialisation is finished
   */
  init(config) {
    config.plugins = config.plugins || [];

    try {
      _.forEach(config.plugins, pluginIdentifier => {
        let requireArg = pluginIdentifier;
        try {
          // Try to load plugins installed in node_modules
          require.resolve(requireArg);
        } catch (e) {
          try {
            // Try to load project specific plugins
            requireArg = path.join(process.cwd(), pluginIdentifier);
            require.resolve(requireArg);
          } catch (e) {
            requireArg = false;
            console.log('WARN: Lager could not find the plugin "' + pluginIdentifier + '"');
          }
        }
        if (requireArg) {
          lager.registerPlugin(require(requireArg), pluginIdentifier);
        }
      });
    } catch (e) {
      return Promise.reject(e);
    }

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
