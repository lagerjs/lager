# Lambda plugin

The `@myrmex/lambda` plugin allows to define and deploy Lambdas. It should work with any runtime but has been tested mostly with
Node.js and secondly with Python.

## Prerequisites

To use the `@myrmex/lambda` plugin, it is necessary to have a minimal knowledge about
[AWS Lambda](https://aws.amazon.com/lambda/).

An AWS user or role that uses the plugin `@myrmex/lambda` must have access to Lambda administration. The AWS policy
`AWSLambdaFullAccess` gives all necessary permissions.

## Installation

Install the npm module in a Myrmex project:

```shell
npm install @myrmex/lambda
```

Then enable the plugin in the `myrmex.json` file:

```json
{
  "name": "my-app",
  "plugins": [
    "@myrmex/lambda"
  ]
}
```

Once the plugin is installed and enabled in the project, the `myrmex` command line will provide new sub-commands to
manage and deploy Lambdas.

## Project anatomy

By default, the content managed by the Lambda plugin is located in an `lambda` directory in the root directory of the
project.

Out of the box, for the Node.js runtime, the Lambda plugin allows to separate the definition of Lambdas from the logic
of the application by providing a specific place to write node modules but it is not mandatory to use it.
`@myrmex/lambda` helps to define and deploy Lambdas but the developer is responsible of the implementation of the
application. Other plugins built on top of the Lambda plugin may be more opinionated.

The directory `lambda/lambdas` contains the Lambdas definitions. For each of its sub-directory is considered as a
Lambda definition. It must contains a `config.json` file and the code of the Lambda. The name of the subdirectory is
used as the Lambda identifier.

The `config.json` file allows to define the runtime, the timeout, the memory, the role and other properties of the
Lambda. The content of the `params` property is used as the argument of the following methods from the AWS SDK:

* [`createFunction()`](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Lambda.html#createFunction-property)
* [`updateFunctionCode()`](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Lambda.html#updateFunctionCode-property)
* [`updateFunctionConfiguration()`](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Lambda.html#updateFunctionConfiguration-property)

Example of `config.json` file:

```json
{
  "params": {
    "Timeout": 10,
    "MemorySize": "256",
    "Runtime": "nodejs8.10",
    "Handler": "index.handler",
    "Role": "arn:aws:iam::012345678901:role/LambdaBasicExecution"
  }
}
```

By default, for the Node.js runtime, the directory `lambda/modules` contains the node modules of the project. For
example, some of these modules could be named `log`, or `data-access` or `authorization` etc...

Each module should have a clear responsibility so that each Lambda can embed only the code it needs. This is a
recommendation but the developer is free to organize the code as he want. The Lambda plugin does not force you to use a
specific project organization.

This is what a project structure could look like:

```shell
lambda
├── lambdas                         The Lambdas defined by the application
|   ├── my-nodejs-lambda            The name of this directory is the identifier of a Lambda
|   |   ├── config.json             The configuration of the Lambda (runtime, memory, timeout, execution role...)
|   |   ├── index.js                A node module that exposes the handler
|   |   └── package.json            It is possible to install the dependencies of the Lambda here
|   └── my-python-lambda            Several runtimes can coexist in a project
|       ├── config.json
|       └── lambda_function.py
└── modules                         The node modules of the application - they can be added as a dependency of a Lambda in its
    |                               package.json file
    ├── authorization               The name of this directory is the identifier of a module
    |   ├── package.json            Package file of the module
    |   ├── index.js                Main file of the module
    |   └── test                    If you wish, you can write the code to test the module in this directory
    ├── data-access
    |   ├── package.json
    |   └── index.js
    └── log
        ├── package.json
        └── index.js
```

Example of `config.json` file:

```json
{
  "params": {
    "Timeout": 30,
    "MemorySize": 256,
    "Role": "arn:aws:iam::123456789012:role/MyRole",
    "Runtime": "nodejs8.10",
    "Handler": "index.handler"
  }
}
```

The `package.json` of a module or a Lambda can declare dependencies with other modules using file paths in the
`dependencies` property:

```json
{
  "name": "data-access",
  "version": "0.0.0",
  "dependencies": {
    "log": "../log"
  }
}
```

In this case, `require('log')` will load the module `log` installed in `lambda/modules/data-access/node_modules/log`.

It is recommended to use relative paths for portability.

It is recommended to use a recent version of `npm` to minimize the size of the Lambda packages and facilitate the
configuration of nested dependencies. Indeed, `npm@2` can behave in an unexpected manner with nested dependencies when
using relative file paths.

## Configuration

These are [Myrmex configuration keys](/manual/installation/getting-started.html#project-configuration) specific to to
the `@myrmex/lambda` plugin.

### Default values

Using `myrmex show-config` after installing the plugin, we can see the default configuration:

```json
{
  "lambda": {
    "lambdasPath": "lambda/lambdas",
    "modulesPath": "lambda/modules"
  }
}
```

### `lambda.lambdasPath`

Path to the folder that contains Lambdas. Default value: `lambda/lambdas`.

### `lambda.modulesPath`

Path to the folder that contains modules for Node.js Lambdas. Default value: `lambda/modules`.

### `lambda.alias`

Set the alias applied when deploying Lambdas.

By setting this configuration, the `--alias` option of the [`myrmex deploy-lambdas`](#deploy-lambdas) command does not
prompt when not provided via the command line and the configured value is used as the default value.

Setting `lambda.alias` to an empty string disables the creation/update of an alias and the new version of the Lambda
will only be available as `LATEST`.

### Example

Using the `myrmex.json` file, the plugin configuration can be defined like this:

```json
{
  "name": "A Myrmex project",
  "plugins": [
    "@myrmex/lambda"
  ],
  "config": {
    "lambda": {
      "lambdasPath": "lambdas",
      "modulesPath": "modules",
      "alias": ""
    }
  }
}

```

## Commands

### create-lambda

```shell
create-lambda [options] [identifier]

  Options:
    -r, --runtime <nodejs|nodejs4.3|nodejs6.10|nodejs8.10|python2.7|python3.6>  select the runtime
    -t, --timeout <timeout>                                                     select the timeout (in seconds)
    -m, --memory <memory>                                                       select the memory (in MB)
    -d --dependencies <modules-names>                                           select the project modules that must be included in the Lambda (only for nodejs runtimes)
    --role <role>                                                               select the execution role (enter the ARN)
```

Create a new Lambda. By default the location of Lambdas is `lambda/lambdas/<identifier>/`.

### create-node-module

*For the Node.js runtime only.*

```shell
create-node-module [options] [name]

  Options:
    -d, --dependencies <dependent-modules>  select the node modules that are dependencies of this new one
```

Prepare a new Node.js module. By default the location of modules is `lambda/modules/<name>/`.

The creation of nodes modules is just a suggestion to organize the code of a project. The idea is to maintain each
component of the application in its own node module to select only relevant components when deploying Lambdas.

Every Lambda can declare its modules dependencies using
[local paths](https://docs.npmjs.com/files/package.json#local-paths) in its `package.json` file. Every module can also
declare dependencies to other modules that way.

When Myrmex deploys a Lambda, it executes `npm install` and the dependencies are installed in the `node_modules` folder.

### deploy-lambdas

```shell
deploy-lambdas [options] [lambda-identifiers...]

  Options:
    --all                            deploy all lambdas of the project
    -r, --region <region>            select the AWS region
    -e, --environment <environment>  select the environment
    -a, --alias <alias>              select the alias to apply
```

Deploy one or more Lambdas in AWS. The `--environment` option is used as a prefix. The `--alias` option will publish a
version in Amazon Lambda and apply an alias. Setting the option to an empty string (`--alias ""`) will skip this.

> When deploying Node.js Lambdas, it is recommended to use npm4 to optimize the size of the packages and avoid the
> resolution of local dependencies with symbolic links (behavior of npm5).

> When deploying Lambdas with C/C++ bindings and/or to be sure to create packages with the correct runtime, use the
> plugin [`@myrmex/packager`](/manual/usage/packager.html)

### install-lambdas-locally

```shell
install-lambdas-locally [lambda-identifiers...]
```

Deletes the `node_modules` folder of one or several lambda and runs `npm install` to re-install it.

### test-lambda-locally

```shell
test-lambda-locally [options] [lambda-identifier]

  Options:
    -e, --event <event-name>  Event example to use
```

Executes a Lambda locally. The event option allows to select the example object that will be passed as the first
argument. Example objects are defined in json files in `lambda/lambdas/<identifier>/events/<event-name>.json`. A mock
of the conshell object is passed as the second argument.

### test-lambda

```shell
test-lambda [options] [lambda-identifier]

  Options:
    --event <event-name>             Event example to use
    -r, --region <region>            select the AWS region
    -e, --environment <environment>  select the environment
    -a, --alias <alias>              select the alias to test
```

Executes a Lambda deployed in AWS. The event option allows to select the example object that will be passed as the first
argument. Example objects are defined in json files in `lambda/lambdas/<identifier>/events/<event-name>.json`. A mock
of the conshell object is passed as the second argument.

Setting the option `--alias` to an empty string (`--alias ""`) will invoke the `LATEST` version of the Lambda.

## Integration with `@myrmex/api-gateway`

`@myrmex/lambda` add some functionalities to  `@myrmex/api-gateway` when both are installed in the same project.

### Associate a Lambda with an API endpoint

In the [`spec.json`](/manual/usage/api-gateway-plugin.html#project-anatomy) file that describes an endpoint, a new
extension to Swagger is available to select a Lambda that must be used for the endpoint integration.

```json
{
  "x-myrmex": {
    "apis": [],
    "lambda": "lambda-identifier"
  }
  ... rest of the endpoint specification
}
```

### New option for `myrmex create-endpoint`

When calling [`myrmex create-endpoint`](/manual/usage/api-gateway-plugin.html#create-endpoint), a new option
`--lambda <lambda-identifier>` is available. This option accepts the identifier of a Lambda managed by `@myrmex/lambda`.

If the option is not provided in the command line and the option `--integration` is set to `lambda` or `lambda-proxy`, a
prompt will propose to select the appropriate Lambda in a list.

The value of `--lambda <lambda-identifier>` will be set in extension to Swagger described above.

### New options for `myrmex deploy-apis`

When calling [`myrmex create-endpoint`](/manual/usage/api-gateway-plugin.html#deploy-apis), two new options are
available:

#### `--deploy-lambdas <all|partial|none>`

The option `--deploy-lambdas <all|partial|none>` accepts three possible values:

* `all` will perform the deployment of all Lambdas defined in the Myrmex project before deploying the APIs.
* `partial` will perform the deployment of all Lambdas that are associated to deployed endpoints before deploying the
  APIs.
* `none` will not deploy any Lambda, but it will retrieve the ARNs of all Lambdas that are associated to deployed
  endpoints. So these Lambda have to be already deployed with the appropriate alias.

#### `--alias <alias>`

The option `--alias <alias>` allows to select the Lambda alias that will be integrated with endpoints.

If the [`lambda.alias`](#-lambda-alias-) configuration is set and the option is not provided via the command line, no
prompt will appear to set the value the configured value is used as the default value.
