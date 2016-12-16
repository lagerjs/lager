---
title: Plugins definition
keywords: lager, core, plugin, events, hooks, extensions
tags: [core, extensions]
summary: "Plugins allows to extend the functionalities of each others"
sidebar: core_sidebar
permalink: core-plugins.html
folder: core
---

The Lager core is the node module `@lager/lager`. It exports an object (refered as the *Lager instance*) that is based on [Pebo](https://github.com/AlexisNo/pebo#readme)
that is a kind of event emitter.

Lager plugins use the *Lager instance* to interact with each other. A Lager plugin can be published on npm to be used by anyone, or it can be a project
specific plugin in the folder `project-root/plugins/my-plugin-identifier`.

Lager plugins can make use of the following functionalities:

*   Listen for events fired by other plugins
*   Fire events that can be listened by other plugins
*   Add functions to the Lager singleton (refered as *extensions*)

## Anatomy of a plugin

A plugin is node module that exports an object that has to respect a specific structure to be used by the *Lager instance*.

Here is a quick overview of an object exported by a Lager plugin.

```javascript
{
  // An unique identifier that should be carefully chosen to not enter in conflict with other plugins
  name: `my-plugin-identifier`,

  // If the plugin is configurable, this place is suggested to define default values
  // This configuration can be overwritten for a project in the file `project-root/config/my-plugin-identifier.json`
  config: {                 // These values will be accessible using
    key1: 'defaultValue1',  // `lager.getConfig("my-plugin-identifier.key1")`
    key2: {                 // `lager.getConfig("my-plugin-identifier.key2")`
      a: 'defaultValue2A',  // `lager.getConfig("my-plugin-identifier.key2.a")`
      b: 'defaultValue2B'   // `lager.getConfig("my-plugin-identifier.key2.b")`
    }
  },

  hooks: {
    // These functions are event listeners that will be called when events "eventNameA" and "eventNameB" are fired by Lager
    // More details about events below
    eventNameA: function (argA, argB) {
      return Promise.resolve()
    },
    eventNameB: function () {
      return Promise.resolve()
    }
  ],

  extensions: {
    // These functions will be registered in the Lager instance so they will be accessible by other plugins
    // More details about extensions below
    extensionNameA: function() {}
    extensionNameB: function() {}
  }
}
```

## The Lager instance

Before describing events and extensions, we should have a quick overview about the initialization of the *Lager instance* and the registration of plugins.

### Initialization by the Lager command line

When the Lager command line is called. It checks if it is called from a Lager project by checking if a `package.json` file containing a dependency to
`@lager/lager` exists in the current path.

Once a `@lager/lager` module have been found, the Lager command line loads it and receives an object: the *Lager instance*.

The Lager command line then load the project configuration (including the list of plugins) and applies it to the *Lager instance*. Each plugin is loaded and
registered in the *Lager instance*.

### Registration of plugins

When the *Lager instance* registers a plugin, it basically performs three operations:

*   Checks if it has to create *event listeners* and create them if needed.
*   Checks if it provides *extensions* and add them to the Lager instance.
*   Create a reference of itself in a `lager` property that it adds to the plugin.

So, once registered by the Lager instance, it is accessible via `plugin.lager`. The plugin can then use it to fire events or call *extensions* that have been
provided by other plugins.

## Events mecanism

The event mecanism of Lager is designed to allow code injection, even when executing asynchronous operations.

From the *event emitter* point of view, when the Lager instance fires an event, it returns a promise of an array containing the arguments of the event. This
arguments may have eventually been transformed by *event listeners*.

From the *event listener* point of view, when the listener function is called, it has the possibility to alter the parameters of the event. If the event
listener has to perform asynchronous operations to alter theses parameters, it should return a Promise that resolves once the modification is done.

Therefore, an *emitter* can wait for all *listeners* to eventually alter the event parameters to continue its task.

Here is a dummy example:

```javascript
// The Lager instance is accessible via the `lager` property of a plugin once it has been registered
const lager = require('./plugin-index.js').lager;

// Create an event listener
lager.when('MyEvent', (myArg1, myArg2) => {
  myArg.propB += ' transformed by an event listener';
  myArg.propC = 'property added by an event listener';
  return Promise.resolve();
});

// We define two objects that will be passed as the event arguments
// Passing literals is not recommended because javascript will copy them when passing them as arguments
// Lager would not be able to retrieve modifications applied to them
const eventArg1 = {
  propA: 'original property',
  propB: 'original property'
}
const eventArg2 = {
  propA: 'original property'
}

lager.fire('MyEvent', eventArg1, eventArg2)
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

Using this mecanism, Lager plugins can create their own events and listen for other plugins events. Several plugins can listen for the same event and
use and/or modify its arguments.

> For example before configuring the integration request of an API endpoints, the `@lager/api-gateway` plugin fires and event that allow other plugins to be
> notified about it. Theses plugins have the opportunity to provide the necessary information for the `@lager/api-gateway` to complete the API configuration by
> passing it to the event's argument.

Note that we do not recommend to call `lager.when()` directly when writing a plugin. We prefer to use the `hooks` property of the object exported by the plugin
to organize your code and be sure that the listeners are attached to the events during the registration of the plugin.

> Note that it is not possible to remove an event listener. That does not seems essential since Lager is always invoked by the command line and does not lives
> in a long time running process but thats something that should be added later. Feel free to propose a pull request to [Pebo](https://github.com/AlexisNo/pebo) !


## Extensions

@todo
