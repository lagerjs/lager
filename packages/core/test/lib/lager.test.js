/*eslint-env mocha */
/* global testRequire */
'use strict';

const assert = require('assert');
const myrmex = testRequire('src/lib/myrmex');

describe('The myrmex instance', function() {

  it('should throw an error if we try to access a plugin that is not registered', () => {
    try {
      myrmex.getPlugin('test');
      assert.ok(false, 'An expected error has been fired');
    } catch (e) {
      return assert.equal(e.message, 'The plugin "test" is not registered in the Myrmex instance', 'An expected error has been fired');
    }
  });

  it('should register a new plugin', () => {
    const plugin = {
      name: 'test',
      hooks: {}
    };
    myrmex.registerPlugin(plugin);
    assert.ok(myrmex.getPlugin('test'));
  });

  it('should be initialized with a configuration object', () => {
    return myrmex.init({});
  });

  it('should throw an error if it is initialized with an invalid configuration object', () => {
    const config = {
      plugins: ['invalid']
    };
    return myrmex.init(config)
    .catch(e => {
      console.log(e);
      assert.equal(e.code, 'MODULE_NOT_FOUND', 'an error has been thrown because o an invalid plugin/module name');
    });
  });

});
