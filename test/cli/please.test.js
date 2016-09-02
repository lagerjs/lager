/*eslint-env mocha */
'use strict';

const assert = require('assert');
const please = require('src/cli/please');
const icli = require('comquirer');


const captureConsoleLog = {
  original: console.log,
  buffer: [],
  begin() {
    this.buffer = [];
    console.log = function() {
      this.buffer.push(arguments);
    };
  },
  end() {
    console.log = this.original;
    return this.buffer;
  }
};

describe('The please sub-command', function() {

  it('is a function', () => {
    assert.equal(typeof please, 'function', 'the module "src/cli/please" exposes a function');
  });

  it('returns a promise', () => {
    assert.equal(typeof please(icli).then, 'function', 'the execution of "please" returns a Promise');
  });

  it('creates a comquirer sub-command', () => {
    assert.equal(icli.getProgram().commands[0]._name, 'please', 'a "please sub command has been created"');
  });

  // To make this test work, icli.getProgram().parse() should return a Promise that resolve when the command finished its execution
  // it('execute the command "please"', (done) => {
  //   captureConsoleLog.begin();
  //   icli.getProgram().parse(['/node/path', '/program/path', 'please']);
  //   captureConsoleLog.end();
  // });

});
