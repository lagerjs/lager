Lager `api-gateway` plugin
===

[![codecov](https://codecov.io/gh/lagerjs/api-gateway/branch/dev/graph/badge.svg)](https://codecov.io/gh/lagerjs/api-gateway)

A Lager plugin to define APIs with the OpenAPI Specification (fka Swagger Specification) and deploy them in AWS API Gateway.

Project anatomy
---

The content managed by `@lager/api-gateway` is located in an `api-gateway` directory in the root directory of the project.

The `@lager/api-gateway` is able to deploy several APIs in Amazon API Gateway. A project's configurations is composed of a list of APIs and a list
of endpoints. Each endpoint specification contains a list of identifiers of the APIs that expose the endpoint.
Therefore, an endpoint `GET /my-resource` can be exposed by a `mobile-app` and a `back-office` APIs, while `PUT /my-resource` can be exposed
by the `back-office` API only.
This allows to create different APIs for different purposes, but sharing some functionalities.

The directory `api-gateway/apis` contains the API definitions. Each of its sub-directory has the name of an API identifier and contains an
Swagger specification file (without the endpoints definitions).

The directory  `api-gateway/endpoints` contains the endpoints definitions. The structure of its sub-directories represents url paths and HTTP methods.
Each HTTP method directory contains the definition of an endpoint. An endpoint definition is composed of its Swagger specification in a `spec.json` file
and its [request mapping template](http://docs.aws.amazon.com/apigateway/latest/developerguide/request-response-data-mappings.html) in an `integration.vm` file.

As an example is more easy to understand, that is what a project structure could looks like:

```text
api-gateway
├── apis                              The APIs defined by the application
|   ├── back-office                   The name of this directory is the identifier of an API
|   |   └── spec.json                 The API's Swagger specification (without endpoints definitions)
|   └── third-party
|       └── spec.json
└── endpoints                         The endpoints defined by the application
    ├── resource-a                    Creates the path /resource-a
    |   ├── {id}                      Creates the path /resource-a/{id}
    |   |   ├── GET                   Creates the HTTP method GET for the path /resource-a/{id}
    |   |   |   ├── integration.vm    The request mapping template of the endpoint GET /resource-a/{id}
    |   |   |   └── spec.json         The Swagger specification of the endpoint GET /resource-a/{id}
    |   |   └── PATCH
    |   |       ├── integration.vm
    |   |       └── spec.json
    |   └── PUT
    |       ├── integration.vm
    |       └── spec.json
    └── resource-b
        ├── GET
        |   ├── integration.vm
        |   └── spec.json
        └── resource-c
            └── GET
                ├── integration.vm
                └── spec.json
```

This project contains 2 APIs:

*   `back-office`
*   `third-party`

5 endpoints are available:

*   `GET /resource-a/{id}`
*   `PATCH /resource-a/{id}`
*   `PUT /resource-a`
*   `GET /resource-b`
*   `GET /resource-b/resource-c`

To associate an endpoint to one or more APIs, we enrich the endpoint specification (`spec.json` file) with the list of the API identifiers,
in a Lager extension for Swagger.

```json
{
  "x-lager": {
    "apis": [
      "back-office",
      "third-party"
    ]
  }
  ... rest of the endpoint specification
}
```

`@lager/api-gateway` uses the API Gateway Import API feature. Therefore, the configuration of AWS-specific authorization
and API Gateway-specific API integrations is done with the [API Gateway extensions to Swagger](http://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-swagger-extensions.html).

Inject environment specific configuration
---

When deploying APIs, we should be able to customise some parameters like ARN value.

There are two main technics to realize that with `@lager/api-gateway`:

*   writing the specification files as node modules
*   writing a Lager plugin

### Writing a specification file as a node module

When it loads `spec.json` files, `@lager/api-gateway` use `require()`. Therefore, it is possible to rename `spec.json` as `spec.js` and export
the specification as an object.

Example:

```javascript
// in /endpoints/resource-a/PUT/spec.js

// We load the arn of the role used to call the integration and the AWS account id from environment variables
// This can be useful to deploy the API in different environments like "development" and "production"
const role = process.env.MY_AUTHORIZATION_ROLE_ARN;
const uri = "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:"
          + process.env.AWS_ACCOUNT_ID
          + ":function:my-lambda:v0/invocations";

module.exports = {
  "x-lager": {
    "apis": [
      "back-office"
    ]
  },
  "consume": [
    "application/json"
  ],
  "produce": [
    "application/json"
  ],
  "x-amazon-apigateway-integration": {
    "credentials": role,
    "uri": uri
    // ... rest of the integration configuration
  }
  // ... rest of the endpoint specification
}
```

### Writting a Lager plugins

@TODO: write this section
