---
title: An overview of the @lager/api-gateway plugin
keywords: lager, api-gateway
tags: [getting_started]
summary: "The @lager/api-gateway plugin allows to define and deploy APIs in Amazon API Gateway using the Swagger specification"
sidebar: api-gateway_sidebar
permalink: api-gateway-overview.html
folder: api-gateway
---

## Prerequisites

To use the `@lager/api-gateway` plugin, you should have a minimal knowledge about [Amazon API Gateway](https://aws.amazon.com/api-gateway/)
and the [Swagger v2.0](http://swagger.io/specification/) specification.

`@lager/api-gateway` uses the API Gateway Import API feature.

## Installation

In the root folder of a lager project:

```bash
npm install -g @lager/api-gateway
```

Then enable the plugin in the `lager.json` config file:

```json
{
  "name": "my-app",
  "plugins": [
    "@lager/api-gateway"
  ]
}
```

Once the plugin is installed and enabled, the `lager` command line will provide new sub-commands to manage and deploy APIs.

## Project anatomy

The content managed by `@lager/api-gateway` is located in an `api-gateway` directory in the root directory of the project.

The `@lager/api-gateway` is able to deploy several APIs in Amazon API Gateway. A project's configurations is composed of a list of APIs and a list
of endpoints. Each endpoint specification contains the list of APIs where it must be exposed.
Therefore, an endpoint `GET /my-resource/{id}` can be exposed by a `mobile-app` API and a `back-office` API, while another endpoint `PUT /my-resource`
can be exposed by the `back-office` API only.
This allows to create different APIs for different purposes while sharing some functionalities.

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
|   └── mobile-app
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
*   `mobile-app`

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
      "mobile-app"
    ]
  }
  ... rest of the endpoint specification
}
```

`@lager/api-gateway` uses the API Gateway Import API feature. Therefore, the configuration of AWS-specific authorization
and API Gateway-specific API integrations is done with the [API Gateway extensions to Swagger](http://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-swagger-extensions.html).
