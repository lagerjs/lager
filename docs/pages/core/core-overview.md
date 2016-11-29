---
title: An overview of Lager and its main plugins
keywords: lager, core
tags: [getting_started]
summary: "An overview of Lager."
sidebar: core_sidebar
permalink: core-overview.html
folder: core
---

An overview of Lager and its main plugins
===

This document is more about the implementation of Lager itself than about how to create a project with it.
Nevertheless, it can be useful to read for people that plan to use Lager.

Prerequisites
---

To work with Lager and it's main plugins, you should to have some notions about:

*   AWS IAM
*   Node.js
*   AWS Lambda
*   Amazon API Gateway
*   OpenAPI (aka Swagger) specification

Lager core
---

The only function of the lager core is to provide a plugin mecanism.

The Lager core is a singleton exposed by the `@lager/lager` npm module. It is based on [Pebo](https://github.com/AlexisNo/pebo#readme) that is a kind of
event emitter.

When the Lager instance fires an event, it returns a promise of an array containing the arguments of the event. This arguments may have eventually been
transformed by *event listeners*.

```javascript
// Load the "lager" singleton
const lager = require('@lager/lager');

// Lager expose its "bluebird" and "lodash" dependencies
const Promise = lager.import.Promise;
const _ = lager.import._;

// Create an event listener
lager.when('MyEvent', (myArg1, myArg2) => {
  myArg.propB += ' transformed by an event listener';
  myArg.propC = 'property added by an event listener';
  return Promise.resolve();
});

// We define two objects that will be passed as the event arguments
// Passing literals is not recommended because javascript will be copy them when passing them as arguments
// Lager would not be able to retrieve modifications done on them
const eventArg1 = {
  propA: 'original property',
  propB: 'original property'
}
const eventArg2 = {
  propA: 'original property'
}

// @todo the new version of Pebo should use fireConcurrently by default
lager.fireConcurrently('MyEvent', eventArg1, eventArg2)
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

Using this mecanism, Lager plugins can *create their own events* and *listen for other plugins events*. Several plugins can listen for the same event and
use and/or modify its arguments.

For example before configuring the integration request of an API endpoints, the `@lager/api-gateway` plugin fires and event that allow other plugins to be
notified about it. Theses plugins have the opportunity to provide the necessary data for the `@lager/api-gateway` to complete the API configuration by passing
it to the event's argument.

Command line interface
---

The Lager cli comes in its own npm module and is installed globally.

```bash
npm install -g @lager/cli
```

The cli is based on [`comquirer`](https://github.com/AlexisNo/comquirer#readme) that is itself based on
[`commander`](https://github.com/tj/commander.js#readme) for the parsing of commands arguments and
[`inquirer`](https://github.com/SBoudrias/Inquirer.js#readme) for the interactive prompt.

`@lager/cli` itself only provide one command that is used to create new Lager projects: `lager new`.

When invoked from a Lager project directory, the cli detects it and loads the `lager` instance. Then, the cli fires an event `registerCommands` passing the
instance of `comquirer` as an argument. The plugins installed in the project can listen for this event and inject new commands in the cli.

Every command implemented in a Lager plugin should be able to be invoked programmatically, passing parameters as arguments and options.

Every command implemented in a Lager plugin should allow to fill parameters via the interactive prompt.

General information about AWS plugins
---

### Permissions needed to deploy the project in AWS

Lager plugins that manage AWS resources need to have permissions to execute commands that communicate with the AWS API. When a command needs these
permissions, Lager will use the AWS credentials provided by the environment.

Each Lager plugin calling the AWS API should document which IAM permissions are needed for each command. Thereby a Lager developer can optimize the
configuration of the IAM policies, users and roles he needs to deploy a project.

### The deployment `context`

When managing content in AWS, Lager plugins take in consideration the notion of `context`. The `context` contains two properties:

*   An environment name that allows to deploy several environment on one AWS account. For example `DEV`, `QA`, `DEVELOPER_JANE`, `DEVELOPER_JOHN`, etc ...
*   A stage name that allows to deploy several versions of the project in one environment. For example `v1`, `v2`, `latest`, etc ...

The use of the `context` will be detailed for each main plugin in the next sections.

IAM plugin
---

The `@lager/iam` plugin allows to define and deploy AWS policies and roles.

It is also useful to allow other plugins to convert a role identifier into an ARN. For example, a project that use the `@lager/node-lambda` plugin could
reference a role as `MyProjectLambdaExecution`. When deploying the Lambda in AWS, the plugin will need a role ARN. The `@lager/iam` plugin should help to
find the correct ARN to use. For example: `arn:aws:iam::012345678912:role/MyProjectLambdaExecution` or
`arn:aws:iam::012345678912:role/DEV_MyProjectLambdaExecution`

However, this kind of functionality must always be optional. Indeed, a project can be able to use permissive IAM policies to perform tasks in a
developer environment to facilitate development but should require a more restrictive configuration for the production environment. For the above example, in
production environment, the role ARN should be directly configured instead of `MyProjectLambdaExecution` and the `@lager/iam` plugin would detect that
it is not necessary to call AWS to retrieve the ARN.

Node Lambda plugin
---

The `@lager/node-lambda` plugin allows to define and deploy AWS Lambda function. It manages `Node.js` modules and Lambda configurations.

### Node.js modules

A Lager project using `@lager/node-lambda` is composed of a collection of `Node.js` modules containing the application's logic. These modules are
independent of AWS Lambda and should be able to be used in any execution environment. It is the developer's responsibility to decide how to write, test
and build them. Lager does not interfere with it.

Examples of possible modules:

*   A module named `log` could be used to define logs levels and write logs in various places.    
*   A module named `data-access` could be used to define models and expose them. Possibly using tools like `sequelize` or `mongoose` or `DynamoDB` etc ...
*   A module named `graphql-server` could be used to define a GraphQL schema and expose a function that resolves queries.

### Lambda functions

A Lambda is defined by three files:

*   A `config.json` file that contains the configuration : timeout, memory, execution role, dependencies with Node.js module cited above ...
*   A `lambda.js` file that contains the handler that will be invoked. All the code that has dependency with to Lambda (mostly calls on the `context` parameter)
    should be located there.
*   A `exec.js` file that exposes a function that be called by the handler and perform the calls to the node modules.

This is the recommended structure to define your Lambda but it is be possible to simply put all the code in the `lambda.js` file.

The name of the folder containing these files will be used as the Lambda identifier.

### Lambda deployment

When deploying a Lambda, the `@lager/node-lambda` plugin will create a zip file containing the Node.js module in a `node_module` folder and the handler.

In AWS, the name of the Lambda will be composed of the `context`'s' environment and the Lambda identifier. Examples: `DEVELOPER_JANE_my-test-lambda`,
`DEV_api-generic` ...

Lager will create a new version of the Lambda and associate an alias corresponding to the `context`'s stage.

API Gateway plugin
---

The definition of APIs with the `@lager/api-gateway` plugin is entirely based on the OpenAPI (aka Swagger) specification and uses the [Swagger import
capability of API Gateway](http://docs.aws.amazon.com/apigateway/latest/developerguide/create-api-using-import-export-api.html) to perform the deployment.

However, `@lager/api-gateway` separates the definitions of endpoints from the definitions of APIs.

### APIs

It is possible to define several APIs to manage with `@lager/api-gateway`. This allows a Lager application to expose various APIs for different consumers of
the same application. For example, an API could expose some endpoints useful for a Back Office and another one could expose some endpoints useful for third
party applications.

### Endpoints

The definition of an endpoint with `@lager/api-gateway` is a portion of Swagger specification that will be added to an API specification. A Lager extension
to Swagger allows to indicate the APIs that have to expose the endpoint.

The specification is located in a path that represents the resource and the method of the action. Examples: `my-resource/PUT/spec.json`,
`my-resource/{id}/GET/spec.json`, `my-resource/{id}/PATCH/spec.json`, `my-resource/{id}/nested-resource/GET/spec.json`.

### API deployment

When deploying an API, its name API Gateway will be composed of the `context`'s environment and the API identifier. Examples: `DEVELOPER_JANE_back-office`,
`DEV_back-office`, `DEV_client-app` ...

Lager will deploy a stage corresponding to the `context`'s stage.

{% include links.html %}
