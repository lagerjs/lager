'use strict';

const _ = require('lodash');

/**
 * Export a function to override commander help generator to group commands by plugin
 * @return {string} - the command help
 */
module.exports = function() {
  if (!this.commands.length) return '';

  var commands = this.commands.filter(function(cmd) {
    return !cmd._noHelp;
  }).map(function(cmd) {
    var args = cmd._args.map(function(arg) {
      return humanReadableArgName(arg);
    }).join(' ');

    return [
      cmd._name
        + (cmd._alias ? '|' + cmd._alias : '')
        + (cmd.options.length ? ' [options]' : '')
        + ' ' + args
      , cmd._description
      , cmd._section
    ];
  });

  var width = commands.reduce(function(max, command) {
    return Math.max(max, command[0].length);
  }, 0);

  const sections = {};
  _.forEach(commands, cmd => {
    const sectionName = cmd[2] ? cmd[2] + ':\n\n' : '';
    sections[sectionName] = sections[sectionName] || [];
    sections[sectionName].push(cmd);
  });

  return [
    ''
    , '  Commands:'
    , ''
    , _.map(sections, function(commands, sectionName) {
      return sectionName + commands.map(function(cmd) {
        var desc = cmd[1] ? '  ' + cmd[1] : '';
        return _.padEnd(cmd[0], width) + desc;
      }).join('\n').replace(/^/gm, '  ');
    }).join('\n\n').replace(/^/gm, '    ')
    , ''
  ].join('\n');
};


/**
 * Takes an argument an returns its human readable equivalent for help usage.
 * @param {Object} arg
 * @return {String}
 * @api private
 */
function humanReadableArgName(arg) {
  var nameOutput = arg.name + (arg.variadic === true ? '...' : '');
  return arg.required
    ? '<' + nameOutput + '>'
    : '[' + nameOutput + ']';
}
