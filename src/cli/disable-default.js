#!/usr/bin/env node
'use strict';

// Nice ES6 syntax
// const { Promise, _, icli } = require('@lager/lager/lib/lager').import;
const lager = require('@lager/lager/lib/lager');
const icli = lager.import.icli;

/**
 * This module exports a function that enrich the interactive command line and return a promise
 * @return {Promise} - a promise that resolve when the operation is done
 */
module.exports = () => {
  const config = {
    cmd: '*',
    description: 'nothing here',
    options: { noHelp: true },
    parameters: []
  };

  /**
   * Create the command and the promp
   */
  return icli.createSubCommand(config, executeCommand);
};

/**
 * Show an error if a unknown command was called
 * @param  {Object} parameters - the parameters provided in the command and in the prompt
 * @return {Promise<null>}
 */
function executeCommand(parameters) {
  let msg = '\n  ' + icli.format.ko('Unknown command \n\n');
  msg += '  Enter ' + icli.format.cmd('lager -h') + ' to see available commands\n';
  msg += '  You have to be in the root folder of your Lager project to see commands implemented by Lager plugins\n';
  console.log(msg);
  process.exit(1);
}
