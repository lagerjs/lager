/**
 * Check if the command is launched from a myrmex project (if there is a myrmex.json file)
 * If yes, load the @myrmex/core node module with the configuration
 */

'use strict';

const path = require('path');
const fs = require('fs');
const _ = require('lodash');

module.exports = function loadProject(icli) {

  const cliPlugin = {
    name: 'cli',
    extensions: {
      print: function() { icli.print.apply(icli, arguments); }
    },
    version: require('../package.json').version
  };

  const projectRoot = getProjectRootDirectory();
  if (projectRoot) {
    process.chdir(projectRoot);
    let myrmex;
    try {
      myrmex = getMyrmexInstance();
    } catch (e) {
      return Promise.reject(e);
    }
    return myrmex.init(getConfig())
    .then(() => {
      // We add the cli plugin
      return myrmex.registerPlugin(cliPlugin);
    })
    .then(() => {
      return myrmex;
    });
  }

  // if there is no myrmex instance to initialise, we return a resolved promise
  return Promise.resolve(null);
};


/**
 * Check if the script is called from a myrmex project and return the root directory
 * @return {string|bool} - false if the script is not called inside a myrmex project, or else, the path to the project root
 */
function getProjectRootDirectory() {
  // From the current directory, check if parent directories have a package.json file and if it contains
  // a reference to the @myrmex/core node_module
  let cwd = process.cwd();
  let packageJson;
  let found = false;

  do {
    try {
      packageJson = require(path.join(cwd, 'package.json'));
      if ((packageJson.dependencies && packageJson.dependencies['@myrmex/core'])
        || (packageJson.devDependencies && packageJson.devDependencies['@myrmex/core'])) {
        found = true;
      } else {
        cwd = path.dirname(cwd);
      }
    } catch (e) {
      cwd = path.dirname(cwd);
    }
  } while (cwd !== path.dirname(cwd) && !found);
  if (found) {
    return cwd;
  }
  return false;
}

/**
 * Load the @myrmex/core module installed in the project
 * @return {Myrmex} - a myrmex instance
 */
function getMyrmexInstance() {
  try {
    return require(path.join(process.cwd(), 'node_modules', '@myrmex', 'core'));
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND' || e.message.slice(e.message.length - 13, -1) !== '@myrmex' + path.sep + 'core') {
      throw e;
    }
    const msg = 'Myrmex seems to be present in a package.json file but not installed. Maybe you have to use `npm install`.';
    process.stderr.write('\n' + msg + '\n\n');
    throw new Error(msg);
  }
}

/**
 * Check if the directory in which the command is launched contains a myrmex.json configuration file and return it
 * @return {Object} - an object that will be consumed by a Myrmex instance
 */
function getConfig() {
  // Load the myrmex main configuration file
  let config = {};
  try {
    // try to load a myrmex.json or myrmex.js file
    config = require(path.join(process.cwd(), 'myrmex'));
  } catch (e) {
    // Silently ignore if there is no configuration file
    return config;
  }

  config.config = config.config || {};

  // Load sub-configuration files
  config.configPath = config.configPath || './config';
  const configPath = path.join(process.cwd(), config.configPath);
  let files = [];
  try {
    files = fs.readdirSync(configPath);
  } catch (e) {
    // Silently ignore if there is no configuration directory
  }
  files.forEach(file => {
    const parse = path.parse(file);
    // We load all .js and .json files in the configuration directory
    if (['.js', '.json'].indexOf(parse.ext) !== -1) {
      config.config[parse.name] = _.merge(config.config[parse.name] || {}, require(path.join(configPath, file)));
    }
  });

  // Add configuration passed by environment variables
  Object.keys(process.env).forEach(key => {
    if (key.substring(0, 6) === 'MYRMEX_') {
      // We transform
      //     MYRMEX_myConfig_levels = value
      // into
      //     { config: { myConfig: { levels: value } } }
      function addParts(config, parts, value) {
        const part = parts.shift();
        if (parts.length === 0) {
          if (value === 'false') { value = false; }
          config[part] = value;
        } else {
          config[part] = config[part] || {};
          addParts(config[part], parts, value);
        }
      }
      addParts(config.config, key.substring(6).split('_'), process.env[key]);
    }
  });

  return config;
}
