---
title: Definition of endpoints with @lager/api-gateway plugin
keywords: lager, api-gateway
tags: [api-gateway]
summary: "The @lager/api-gateway plugin allows to define endpoints in a directory structure and attach them to APIs"
sidebar: api-gateway_sidebar
permalink: api-gateway-endpoints.html
folder: api-gateway
---

## Creating endpoints paths and methods

The `api-gateway/endpoints` folder contains the base specification of endpoints defined by the application.

To define an endpoint, create a directory structure that follows the resource path.
In this structure, create directories named by HTTP methods (GET, POST, PUT, PATCH or DELETE).
In the HTTP method directories, create a file `spec.json` that contains the Swagger specification of the endpoint.

> You can also create `spec.json` files higher in the directory structure. The final specification of an endpoint will be the merge of all `spec.json` file
> present in its path. This allows to avoid the repetition of configurations that apply to several endpoints but it also can be harder to have a look at a
> complete endpoint specification. The command `lager inspect-endpoint` can help about this.

For example, an application that creates and track deliveries could provide these endpoints:

*   `POST   /delivery` to create a new delivery
*   `DELETE /delivery/{id}` to delete a delivery
*   `GET    /delivery/{id}` to track a delivery
*   `PATCH  /delivery/{id}` to update a delivery

The structure of the `endpoints` folder of this application should look like this:

```text
└── api-gateway
    └── endpoints
        └── delivery
            ├── spec.json          // The specification written in this file will apply
            |                      // to all endpoints having a resource path that begins with /delivery
            ├── POST
            |   └── spec.json
            └── {id}
                ├── spec.json      // The specification written in this file will apply
                |                  // to all endpoints having a resource path that begins with /delivery/{id}
                ├── DELETE
                |   └── spec.json  // The specification written in this file will apply
                |                  // to the endpoint DELETE /delivery/{id}
                ├── GET
                |   └── spec.json
                └── PATCH
                    └── spec.json
```

## Specification of an endpoint

### The use API Gateway extensions to Swagger

The `spec.json` file of an endpoint contains a Swagger specification that supports [API Gateway extensions](http://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-swagger-extensions.html).
Indeed, `@lager/api-gateway` uses the [Swagger import capability](http://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-import-api.html)
of API Gateway to perform deployments, so everything that is supported by API Gateway will be supported by Lager. You may ask why you would use
`@lager/api-gateway` and not the API Gateway Swagger importer directly.

*   Lager allows to separate the specification of endpoints from the APIs that expose them and so to compose a variety of APIs without repeating yourself.
*   The configuration of IAM authorizations can be simplified thanks to `@lager/iam`.
*   Lager comes with a notion of *environment* that allows you to deploy various instances of your project in a single AWS account.
*   Lager allows to dynamically alter API specifications using JavaScript directly in specification files or in Lager plugins.

During development, it can be convenient to configure an endpoint using the AWS Console and then use the Swagger export functionality to see how to define it
correctly in your Lager project.

### Attach an endpoint to one or more APIs

A Lager extension to Swagger allows to select the APIs that have to expose an endpoint. At the root of the endpoint specification, we define a `x-lager` attribute
that contains an `apis` attribute that contains a list of API identifiers.

For example, if we want to associate an endpoint to the APIs defined in `api-gateway/apis/back-office/spec.json` and `api-gateway/apis/mobile-app/spec.json`,
the `spec.json` file of the endpoint will look like this:

```json
{
  "x-lager": {
    "apis": [
      "back-office",
      "mobile-app"
    ]
  },
  "summary": "My description of the endpoint"
  // ... Rest of the endpoint specification here ...
}
```

### Dynamically alter a specification

When reading a specification file, `@lager/api-gateway` is using `require("api-gateway/endpoints/<resource-path>/<METHOD>/spec")`. So a `spec.json` file can be
rewritten into a `spec.js` node module that exports the desired specification.

As a dummy example, if we want to dynamically set the summary of an endpoint according to an environment variable, the `spec.js` file of the endpoint will
look like this:

```javascript
module.exports = `{
  "x-lager": {
    "apis": [
      "back-office"
    ]
  },
  "summary": "${process.env.MY_DYNAMIC_SUMMARY}",
  "consume": [
    "application/json"
  ],
  "produce": [
    "application/json"
  ],
  "responses": {
    "200": {}
  }`;
```

Another method to dynamically alter a specification is to write a Lager plugin that listens for `@lager/api-gateway` events.
