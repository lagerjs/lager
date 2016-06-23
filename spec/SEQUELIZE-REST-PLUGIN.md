Some ideas about how the Sequelize-rest-blueprints plugin could be implemented
===

Configuration:

*   Select the APIs where we have to apply the blueprints (defaults to all)
*   Select the Lambda that has to execute the code
*   A folder `libs/db-models` contains the models definitions

```javascript
// Pseudo code to implement the sequelize blueprints
{
  afterAddEndpointsToApis: function(api) {
    if (applyBlueprintsToApi(api)) {
      // Loop threw the Sequelize models
      _.forEach(models, function(model) {
        // Create REST endpoints to manipulate the models
        api.addEndpoint({
          path: model.name
          method: 'GET'
          spec: {}
        })
      })
    }
  },

  beforeBuildLambdaPackage: function(pathToPackage) {
    if (lambdaExecuteBlueprints(apiSpec)) {
      // We add the sequelize models to the package
      copy(modelsFolder, pathToPackage);
      copy(blueprintRouter, pathToPackage + '/lager-routers');
    }
})
```
