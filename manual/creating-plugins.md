## Plugin definition

The Myrmex core is the node module `@myrmex/core`. It exports an object (referred as the *Myrmex instance*) that is based on
[Pebo](https://github.com/AlexisNo/pebo#readme) that is a kind of event emitter.

Myrmex plugins use the *Myrmex instance* to interact with each other. A Myrmex plugin can be published on npm to be used by
anyone, or it can be a project specific plugin in the folder `plugins/my-plugin-identifier` of the project.

Myrmex plugins can make use of the following functionalities:

*   Listen for events fired by other plugins
*   Fire events that can be listened by other plugins
*   Attach functions to the *Myrmex instance* (refered as *extensions*)

### Anatomy of a plugin

A plugin is node module that exports an object that has to respect a specific structure to be used by the *Myrmex instance*.

Here is a quick overview of an object exported by a Myrmex plugin.

```javascript
{
  // An unique identifier that should be carefully chosen to not enter in conflict with other plugins
  name: `my-plugin-identifier`,

  // If the plugin is configurable, this place is suggested to define default values
  // This configuration can be overwritten for a project in the file
  // `project-root/config/my-plugin-identifier.json`
  config: {                 // These values will be accessible using
    key1: 'defaultValue1',  // `myrmex.getConfig("my-plugin-identifier.key1")`
    key2: {                 // `myrmex.getConfig("my-plugin-identifier.key2")`
      a: 'defaultValue2A',  // `myrmex.getConfig("my-plugin-identifier.key2.a")`
      b: 'defaultValue2B'   // `myrmex.getConfig("my-plugin-identifier.key2.b")`
    }
  },

  hooks: {
    // These functions are event listeners that will be called
    // when events "eventNameA" and "eventNameB" are fired by Myrmex
    // More details about events below
    eventNameA: function (argA, argB) {
      return Promise.resolve()
    },
    eventNameB: function () {
      return Promise.resolve()
    }
  ],

  extensions: {
    // These functions will be registered in the Myrmex instance
    // so they will be accessible by other plugins
    // More details about extensions below
    extensionNameA: function() {}
    extensionNameB: function() {}
  }
}
```

### The Myrmex instance

Before describing events and extensions, we should have a quick overview about the initialization of the *Myrmex instance* and
the registration of plugins.

#### Initialization by the Myrmex command line

When the Myrmex command line is called. It checks if it is called from a Myrmex project by searching for a `package.json` file
containing a dependency to `@myrmex/core` in the current path.

Once a `@myrmex/core` module have been found, the Myrmex command line loads it and receives an object: the *Myrmex instance*.

The Myrmex command line then loads the project configuration (including the list of plugins) and applies it to the *Myrmex
instance*. Each plugin is loaded and registered in the *Myrmex instance*.

#### Registration of plugins

When the *Myrmex instance* registers a plugin, it basically performs three operations:

*   Checks if it there is a list of hooks and create the *event listeners*.
*   Checks if it there are *extensions* and add them to the Myrmex instance.
*   Create a reference of itself in a `myrmex` property that is added to the plugin.

So, once a plugin has been registered by the *Myrmex instance*, it has a new `myrmex` property that contains the *Myrmex
instance*. It can be used to fire events or call *extensions* that have been provided by other plugins.

### Events mecanism

The event mecanism of Myrmex is designed to allow code injection and works with asynchronous operations.

From the *event emitter* point of view, when the *Myrmex instance* fires an event, it returns a promise of an array containing
the arguments of the event. These arguments have eventually been transformed by *event listeners*.

From the *event listener* point of view, when the listener function is called, it has the possibility to alter the parameters
of the event. If the event listener has to perform asynchronous operations to alter theses parameters, it should return a
Promise that resolves once the modification is done.

Therefore, an *emitter* can wait for all *listeners* to eventually alter the event parameters to continue its task.

Here is a dummy example:

```javascript
// The Myrmex instance is accessible via the `myrmex` property of a plugin once it has been registered
const myrmex = require('./plugin-index.js').myrmex;

// Create an event listener
myrmex.when('MyEvent', (myArg1, myArg2) => {
  myArg.propB += ' transformed by an event listener';
  myArg.propC = 'property added by an event listener';
  return Promise.resolve();
});

// We define two objects that will be passed as the event arguments
// Passing literals is not recommended because JavaScript will copy them when passing them as arguments
// Myrmex would not be able to retrieve modifications applied to them
const eventArg1 = {
  propA: 'original property',
  propB: 'original property'
}
const eventArg2 = {
  propA: 'original property'
}

myrmex.fire('MyEvent', eventArg1, eventArg2)
.then(arg => {
  console.log(arg[0]);
  //  {
  //    propA: 'original property',
  //    propB: 'original property transformed by an event listener',
  //    propC: 'property added by an event listener'
  //  }
  console.log(arg[1]);
  //  {
  //    propA: 'original property'
  //  }
});
```

Using this mecanism, Myrmex plugins can create their own events and listen for other plugins events. Several plugins can listen
for the same event and use and/or modify its arguments.

> For example, before configuring the integration request of API endpoints, the `@myrmex/api-gateway` plugin fires and event
that allows other plugins to be notified about it. Theses plugins have the opportunity to inject data in the event's argument
so the plugin `@myrmex/api-gateway` can generate a compete API specification.

Note that we do not recommend to call `myrmex.when()` directly when writing a plugin. We prefer to use the `hooks` property of
the object exported by the plugin to organize the code and be sure that the listeners are attached to the events during the
registration of the plugin.

> Note that it is not possible to remove an event listener. That does not seems essential since Myrmex is always invoked by the
command line and does not lives in a long time running process but that is something that should be added later. Feel free to
propose a pull request on [Pebo](https://github.com/AlexisNo/pebo) !


### Extensions

@todo
