---
title: The Lager core
keywords: lager, core
tags: [getting_started]
sidebar: core_sidebar
permalink: core-overview.html
folder: core
---

The documentation of the core module contains two very distinctive parts:

*   The configuration of a project to work with AWS.
*   The defintion of plugins

While the first part is essential to every user of Lager, the second one is only useful if you already are an intermediate/avanced user.
Nevertheless, it *can* be useful to read for anybody that plans to use Lager.

## IAM plugin

The `@lager/iam` plugin allows to define and deploy AWS policies and roles.

It is also useful to allow other plugins to convert a role identifier into an ARN. For example, a project that use the `@lager/node-lambda` plugin could
reference a role as `MyProjectLambdaExecution`. When deploying the Lambda in AWS, the plugin will need a role ARN. The `@lager/iam` plugin should help to
find the correct ARN to use. For example: `arn:aws:iam::012345678912:role/MyProjectLambdaExecution` or
`arn:aws:iam::012345678912:role/DEV_MyProjectLambdaExecution`

However, this kind of functionality must always be optional. Indeed, a project can be able to use permissive IAM policies to perform tasks in a
developer environment to facilitate development but should require a more restrictive configuration for the production environment. For the above example, in
production environment, the role ARN should be directly configured instead of `MyProjectLambdaExecution` and the `@lager/iam` plugin would detect that
it is not necessary to call AWS to retrieve the ARN.

## Node Lambda plugin

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

## API Gateway plugin

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
