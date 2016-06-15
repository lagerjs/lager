'use strict';

const assert = require('assert');
const Promise = require('bluebird');
const lager = require('../../lib/lager');


describe('The lager instance', function() {

  it('should fire events', function (done) {
    lager.fire('superEvent', 'a string', { foo: 'lager', bar: 100 })
    .spread(function (arg1, arg2) {
      assert.equal(arg1, 'a string', 'the first argument is correctly retrieved');
      assert.equal(arg2.foo, 'lager', 'the second argument is correctly retrieved (1)');
      assert.equal(arg2.bar, 100, 'the second argument is correctly retrieved (2)');
      done();
    });
  });

  it('should register plugins', function (done) {
    lager.registerPlugin({
      hooks: {
        myEvent: (arg1, arg2) => {
          arg1 += ' modified by a plugin';
          arg2.bar += 23;
          return Promise.resolve([arg1, arg2]);
        }
      }
    });
    lager.registerPlugin({
      hooks: {
        myEvent: (arg1, arg2) => {
          arg2.baz = 'value from plugin';
          return Promise.resolve([arg1, arg2]);
        }
      }
    });
    done();
  });

  it('should retrieve data altered by plugins', function (done) {
    lager.fire('myEvent', 'a string', { foo: 'lager', bar: 100 })
    .spread(function(arg1, arg2) {
      assert.equal(arg1, 'a string modified by a plugin', 'the first argument is correctly retrieved');
      assert.equal(arg2.foo, 'lager', 'the second argument is correctly retrieved (1)');
      assert.equal(arg2.bar, 123, 'the second argument is correctly retrieved (2)');
      assert.equal(arg2.baz, 'value from plugin', 'the second argument is correctly retrieved (3)');
      done();
    });
  });

});
