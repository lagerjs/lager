/**
 * Check if the command is launched from a lager project (if there is a lager.json file)
 * If yes, load the @lager/lager node module with the configuration
 */

'use strict';

const path = require('path');
const fs = require('fs');

module.exports = function loadLagerProject(icli) {
  const projectRoot = getProjectRootDirectory();
  if (projectRoot) {
    process.chdir(projectRoot);
    let lager;
    try {
      lager = getLagerInstance('@lager/lager');
    } catch (e) {
      return Promise.reject(e);
    }
    return lager.init(getConfig())
    .then(() => {
      // We fire the "registerCommands" event so plugins can add their own commands
      return lager.fireConcurrently('registerCommands', icli);
    })
    .then(() => {
      return lager;
    });
  }

  // if there is no lager instance to initialise, we return a resolved promise
  return Promise.resolve(true);
};


/**
 * Check if the script is called from a lager project and return the root directory
 * @return {string|bool} - false if the script is not called inside a lager project, or else, the path to the project root
 */
function getProjectRootDirectory() {
  // From the current directory, check if parent directories have a package.json file and if it contains
  // a reference to the @lager/lager node_module
  let cwd = process.cwd();
  let packageJson;
  let found = false;

  do {
    try {
      packageJson = require(path.join(cwd, 'package.json'));
      if (packageJson.dependencies && packageJson.dependencies['@lager/lager']) {
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
 * Load the @lager/lager module installed in the project
 * @return {Lager} - a lager instance
 */
function getLagerInstance() {
  try {
    return require(path.join(process.cwd(), 'node_modules', '@lager', 'lager'));
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND' || e.message.slice(e.message.length - 13, -1) !== '@lager' + path.sep + 'lager') {
      throw e;
    }
    throw new Error('Lager seems to be present in a package.json file but not installed. Maybe you have to use `npm install`.');
  }
}

/**
 * Check if the directory in which the command is launched contains a lager.json configuration file and return it
 * @return {Object} - an object that will be consumed by a Lager instance
 */
function getConfig() {
  // Load the lager main configuration file
  let config = {};
  try {
    // try to load a lager.json file
    config = require(path.join(process.cwd(), 'lager.json'));
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
    return config;
  }
  files.forEach(file => {
    const parse = path.parse(file);
    // We load all .js and .json files in the configuration directory
    if (['.js', '.json'].indexOf(parse.ext)) {
      config.config[parse.name] = require(path.join(configPath, file));
    }
  });

  return config;
}
