# API Gateway Plugin

## Prerequisites

To use the `@myrmex/api-gateway` plugin, it is necessary to have a minimal knowledge about [Amazon API
Gateway](https://aws.amazon.com/api-gateway/) and the [Swagger v2.0](http://swagger.io/specification/) specification.

`@myrmex/api-gateway` uses the API Gateway Import API feature.

## Installation

Install the npm module in a Myrmex project:

```bash
npm install @myrmex/api-gateway
```

Then enable the plugin in the `myrmex.json` file:

```json
{
  "name": "my-app",
  "plugins": [
    "@myrmex/api-gateway"
  ]
}
```

Once the plugin is installed and enabled, the `myrmex` command line will provide new sub-commands to manage and deploy APIs.

## Project anatomy

By default, the content managed by `@myrmex/api-gateway` is located in an `api-gateway` directory in the root directory of the
project.

A project configuration is composed of a list of APIs and a list of endpoints. Each endpoint specification contains the list
of APIs where it must be exposed. Therefore, an endpoint `GET /my-resource/{id}` can be exposed by a `mobile-app` API and a
`back-office` API, while another endpoint `PUT /my-resource` can be exposed by the `back-office` API only. This allows to
create different APIs for different purposes while sharing some functionalities.

The directory `api-gateway/apis` contains the API definitions. Each of its sub-directory has the name of an API identifier and
contains a Swagger specification file (without the endpoints definitions).

The directory `api-gateway/endpoints` contains the endpoints definitions. The structure of its sub-directories represents url
paths and HTTP methods. Each HTTP method directory contains the definition of an endpoint. An endpoint definition is composed
of its Swagger specification in a `spec.json` file.

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
    |   |   |   └── spec.json         The Swagger specification of the endpoint GET /resource-a/{id}
    |   |   └── PATCH
    |   |       └── spec.json
    |   └── PUT
    |       └── spec.json
    └── resource-b
        ├── GET
        |   └── spec.json
        └── resource-c
            └── GET
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

To associate an endpoint to one or more APIs, it is possible to enrich the endpoint specification (`spec.json` file) with a
list of API identifiers, in a Myrmex extension for Swagger.

```json
{
  "x-myrmex": {
    "apis": [
      "back-office",
      "mobile-app"
    ]
  }
  ... rest of the endpoint specification
}
```

`@myrmex/api-gateway` uses the API Gateway Import API feature. Therefore, the configuration of AWS-specific authorization
and API Gateway-specific API integrations is done with the [API Gateway extensions to
Swagger](http://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-swagger-extensions.html).

## Commands

### create-api

```
create-api [options] [api-identifier]

  Options:
    -t, --title <title>       The title of the API
    -d, --desc <description>  A description of the API
```

Create a new API. By default the location of APIs is `api-gateway/apis/<api-dentifier>/`.

### create-model

```
create-model [name]
```

Create a new model. By default the location of models is `api-gateway/model/model.json`. Models can be referenced as input
or output of API endpoints but are not mandatory.

### create-endpoint

create-endpoint [options] [resource-path] [http-method]

  create a new API endpoint

  Options:

    -h, --help                            output usage information
    -a, --apis <api-identifiers>          The identifiers of APIs that expose the endpoint separated by ","
    -s, --summary <endpoint summary>      A short summary of what the operation does
    --auth <authentication-type>          The type of authentication used to call the endpoint (aws_iam|none)
    -i --integration <integration-type>   The type of integration (lambda|http|mock|aws-service)
    -l --lambda <lambda-name|lambda-arn>  The Lambda to integrate with the endpoint
    -r, --role <role>                     select the role to invoke integration
