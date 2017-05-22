Lager plugins and hooks
===

Hooks allow to inject code during the execution of Lager.

Definition of plugins
---

A lager plugin is a node.js module that expose an object that has properties implementing hook functions.
A function that implements a hook MUST return the `Promise` of a array containing its own parameters,
eventually transformed.

```javascript
module.exports = {
  name: 'myShinyPlugin',
  aHookThatIWantToUse: function(argument1, argument2) {
    // Here we can alter argument1 and argument2
    return Promise.resolve([argument1, argument2]);
  },
  anotherHookThatIWantToUse: function(argument1) {
    // Here we can add code
    return codeThatReturnsAPromise()
    .then((promisedResult) => {
      // Here I can alter argument1 with data from promisedResult
      // ...
      return Promise.resolve([argument1]);
    }
  }
};
```

Hooks fired by Lager api-gateway
---

```javascript
module.exports = {
  // Load API configurations
  beforeApisLoad: function() {},
  beforeApiLoad: function(apiSpecPath, identifier),
  afterApiLoad: function(api) {},
  afterApisLoad: function() {},

  // Load endpoint configurations
  beforeEndpointsLoad: function() {},
  beforeEndpointLoad: function() {},
  afterEndpointLoad: function(endpoint) {},
  afterEndpointsLoad: function(endpoints) {},

  // Execute integration plugins
  // Here we can deploy Lambdas or proxified URLs and create instances of IntegrationDataInjector
  loadIntegrations: function([]) {},
  beforeAddIntegrationDataToEndpoints: function(endpoints, integrationDataInjectors) {},
  afterAddIntegrationDataToEndpoints: function(endpoints, integrationDataInjectors) {},

  beforeAddEndpointsToApis: function(apis, endpoints) {},
  beforeAddEndpointToApi: function(api, endpoint) {},
  afterAddEndpointToApi: function(api, endpoint) {},
  afterAddEndpointsToApis: function(apis, endpoints) {},

  beforePublishAllApis: function(apis) {},
  beforePublishApi: function(api) {},
  afterPublishApi: function(api) {},
  afterPublishAllApis: function(apis) {}
};
```

Hooks fired by Lager iam

```javascript
// TODO
module.exports = {
  beforeDeployAllPolicies: function() {},
  beforeDeployPolicy: function() {},
  beforeCreatePolicy: function() {},
  afterCreatePolicy: function() {},
  beforeUpdatePolicy: function() {},
  afterUpdatePolicy: function() {},
  afterDeployPolicy: function() {},
  afterDeployAllPolicies: function() {},

  beforeDeployAllRoles: function() {},
  beforeDeployRole: function() {},
  beforeAttachPoliciesToRole: function() {},
  afterAttachPoliciesToRole: function() {},
  beforeCreateRole: function() {},
  afterCreateRole: function() {},
  beforeUpdateRole: function() {},
  afterUpdateRole: function() {},
  afterDeployRole: function() {},
  afterDeployAllRoles: function() {}
};
```

Hooks fired by Lager lambda
---

```javascript
module.exports = {
  beforeLambdasLoad: function() {}, // DONE
  beforeLambdaLoad: function(lambdaConfigPath, identifier), // DONE
  afterLambdaLoad: function(lambda), // DONE
  afterLambdasLoad: function(lambdas), // DONE

  // TODO
  beforeDeployAllLambdas: function(lambdas) {},
  beforeDeployLambda: function(lambda) {},

  beforeCreateLambda: function(lambda) {},
  beforeUpdateLambda: function(lambda) {},
  beforeBuildLambdaPackage: function(lambda) {},
  afterBuildLambdaPackage: function(lambda) {},
  afterUpdateLambda: function(lambda) {},
  afterCreateLambda: function(lambda) {},

  beforePublishLambdaVersion: function(lambda) {},
  afterPublishLambdaVersion: function(lambda) {},

  afterDeployLambda: function(lambda) {},
  afterDeployAllLambdas: function(lambdas) {}
};
```

Create new hooks
---

A lager plugin can fire it's own hooks by calling `lager.fire()`

```javascript
lager.fire('myNewHookToInjectCode', argument1, argument2)
.spread((argument1, argument2) => {
  // Here I can continue to execute my plugin with arguments eventually transformed by other plugins
  // ...
});
```
