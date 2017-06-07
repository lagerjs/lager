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
list of API identifiers, in a Myrmex extension to Swagger.

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

Create a new API. By default the location of API definitions is `api-gateway/apis/<api-dentifier>/`. The API definition is a
file named `spec.json` that contains a [Swagger object](http://swagger.io/specification/#swagger-object-14). The command line
will to create a simple base configuration. It is possible to write a full Swagger definition here, but the plugin
`@myrmex/api-gateway` is designed to separate API definitions into pieces and generate full definitions when needed.

### create-model

```
create-model [name]
```

Create a new model. By default the location of models is `api-gateway/model/model.json`. Models can be referenced as input
or output of API endpoints but are not mandatory.

### create-endpoint

```
create-endpoint [options] [resource-path] [http-method]

  Options:
    -a, --apis <api-identifiers>          The identifiers of APIs that expose the endpoint separated by ","
    -s, --summary <endpoint summary>      A short summary of what the operation does
    --auth <authentication-type>          The type of authentication used to call the endpoint (aws_iam|none)
    -i --integration <integration-type>   The type of integration (lambda|http|mock|aws-service)
    -r, --role <role>                     select the role to invoke integration
```

Create a new endpoint. By default the location of endpoints definitions is
`api-gateway/endpoints/<resource-path>/<http-method>/`. The endpoint definition is a file named `spec.json` that contains a
[Swagger path item object](http://swagger.io/specification/#path-item-object-32). The command line will help to create a
simple base configuration. Then, the developer can complete the definition using the Swagger specification and the [API
Gateway extentions to Swagger](http://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-swagger-extensions.html).

The definition of an endpoint can be added to one or more APIs using a Myrmex extention to Swagger:

```json
{
  "x-myrmex": {
    "apis": [
      "<api-identifier-a>",
      "<api-identifier-b>"
    ]
  }
  ... rest of the endpoint specification
}
```

### inspect-api

```
inspect-api [options] [api-identifier]

  Options:
    -c, --colors                  highlight output
    -s, --spec-version <version>  select the type of specification to retrieve: doc|aws|complete
```

Generate the Swagger definition of an API and print it. There are three different versions of the specification:

*   The `doc` version only contains parts of the definitions that belong to the Swagger specification.
*   The `aws` version is the definition that is sent to AWS API gateway when performing a deployment.
*   The `complete` version contains everything that is defined in the project, including the Myrmex extensions to Swagger.

### inspect-endpoint

```
inspect-endpoint [options] [resource-path] [http-method]

  Options:
    -c, --colors                  highlight output
    -s, --spec-version <version>  select the type of specification to retrieve: doc|aws|complete
```

Generate the Swagger definition of an endpoint and print it. There are three different versions of the specification:

*   The `doc` version only contains parts of the definitions that belong to the Swagger specification.
*   The `aws` version is the definition that is sent to AWS API gateway when performing a deployment.
*   The `complete` version contains everything that is defined in the project, including the Myrmex extensions to Swagger.

### deploy-apis

```
deploy-apis [options] [api-identifiers...]

  Options:
    -r, --region <region>            select the AWS region
    -e, --environment <environment>  select the environment
    -s, --stage <stage>              select the API stage
```

Deploy one or more APIs in API Gateway. The `--environment` option is used as a prefix to the API name in API Gateway. It can
be useful to deploy APIs several time in the same AWS account. Values for `--environment` could be `PROD` or `DEV` or `JOHN`
to be able to deploy the API for production, development or a developer environment.

> The use of `--environment` can seem redundant with `--stage`, but when deploying an API Gateway stage, it is not to
possible to access to the testing tools of the AWS console. These tools are available only for the ultimate version of the
API. Using `--environment` can allow several developers to use the testing tools of the AWS console simultaneously.
`--environment` also allows to use `--stage` for other purposes like API versioning (with values like `v1`, `v2`,
`2017-01-01` ...).
