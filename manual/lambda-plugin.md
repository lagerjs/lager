# Lambda plugin

The Lambda plugin allows to define and deploy Lambdas. It should work with any runtime but has been tested mostly with
Node.js and secondly with Python.

## Prerequisites

To use the `@myrmex/lambda` plugin, it is necessary to have a minimal knowledge about
[AWS Lambda](https://aws.amazon.com/lambda/).

An AWS user or role that uses the plugin `@myrmex/lambda` must have access to Lambda administration. The AWS policy
`AWSLambdaFullAccess` gives all necessary permissions.

## Installation

Install the npm module in a Myrmex project:

```bash
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

Once the plugin is installed and enabled in the project, the `myrmex` command line will provide new sub-commands to manage and
deploy Lambdas.

## Project anatomy

By default, the content managed by the Lambda plugin is located in an `lambda` directory in the root directory of the
project.

Out of the box, for the Node.js runtime, the Lambda plugin allows to separate the definition of Lambdas from the logic of the
application by providing a specific place to write node modules but it is not mandatory to use it. `@myrmex/lambda` helps to
define and deploy Lambdas but the developer is responsible of the implementation of the application. Other plugins built on
top of the Lambda plugin may be more opinionated.

The directory `lambda/lambdas` contains the Lambdas definitions. For each of its sub-directory is considered as a
Lambda definition. It must contains a `config.json` file and the code of the Lambda. The name of the subdirectory is used
as the Lambda identifier.

The `config.json` file allows to define the runtime, the timeout, the memory, the role and other properties of the Lambda.
The content of the `params` property is used as the argument of the following methods from the AWS SDK:

* [`createFunction()`](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Lambda.html#createFunction-property)
* [`updateFunctionCode()`](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Lambda.html#updateFunctionCode-property)
* [`updateFunctionConfiguration()`](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Lambda.html#updateFunctionConfiguration-property)

By default, for the Node.js runtime, the directory `lambda/modules` contains the node modules of the project. For example,
some of these modules could be named `log`, or `data-access` or `authorization` etc...

Each module should have a clear responsibility so that each Lambda can embed only the code it needs. This is a recommendation
but the developer is free to organize the code as he want. The Lambda plugin does not force you to use a specific project
organization.

This is what a project structure could look like:

```text
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
    "Runtime": "nodejs6.10",
    "Handler": "index.handler"
  }
}
```

The `package.json` of a module or a Lambda can declare dependencies with other modules using file paths in the `dependencies`
property:

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
configuration of nested dependencies. Indeed, `npm@2` can behave in an unexpected manner with nested dependencies when using
relative file paths.

## Commands

### create-lambda

```
create-lambda [options] [identifier]

  Options:
    -r, --runtime <nodejs|nodejs4.3|nodejs6.10|python2.7|python3.6>  select the runtime
    -t, --timeout <timeout>                                          select the timeout (in seconds)
    -m, --memory <memory>                                            select the memory (in MB)
    -d --dependencies <modules-names>                                select the project modules that must be included in the Lambda (only for nodejs runtimes)
    --role <role>                                                    select the execution role (enter the ARN)
```

Create a new Lambda. By default the location of Lambdas is `lambda/lambdas/<identifier>/`.

### create-node-module

*For the Node.js runtime only.*

```
create-node-module [options] [name]

  Options:
    -d, --dependencies <dependent-modules>  select the node modules that are dependencies of this new one
```

Prepare a new Node.js module. By default the location of modules is `lambda/modules/<name>/`.

The creation of nodes modules is just a suggestion to organize the code of a project. The idea is to maintain each component
of the application in its own node module to select only relevant components when deploying Lambdas.

Every Lambda can declare its modules dependencies using [local paths](https://docs.npmjs.com/files/package.json#local-paths)
in its `package.json` file. Every module can also declare dependencies to other modules that way.

When Myrmex deploys a Lambda, it executes `npm install` and the dependencies are installed in the `node_modules` folder.

### deploy-lambdas

```
deploy-lambdas [options] [lambda-identifiers...]

  Options:
    --all                            deploy all lambdas of the project
    -r, --region [region]            select the AWS region
    -e, --environment [environment]  select the environment
    -a, --alias [alias]              select the alias to apply
```

Deploy one or more Lambdas in AWS. The `--environment` option is used as a prefix. The `--alias` option will publish a version
in Amazon Lambda and apply an alias. Setting the option to an empty string (`--alias ""`) will skip this.

### install-lambdas-locally

```
install-lambdas-locally [lambda-identifiers...]
```

Deletes the `node_modules` folder of one or several lambda and runs `npm install` to re-install it.

### test-lambda-locally

```
test-lambda-locally [options] [lambda-identifier]

  Options:
    -e, --event <event-name>  Event example to use
```

Executes a Lambda locally. The event option allows to select the example object that will be passed as the first argument.
Example objects are defined in json files in `lambda/lambdas/<identifier>/events/<event-name>.json`. A mock of the context
object is passed as the second argument.

### test-lambda

```
test-lambda [options] [lambda-identifier]

  Options:
    --event <event-name>             Event example to use
    -r, --region [region]            select the AWS region
    -e, --environment [environment]  select the environment
    -a, --alias [alias]              select the alias to test
```

Executes a Lambda deployed in AWS. The event option allows to select the example object that will be passed as the first
argument. Example objects are defined in json files in `lambda/lambdas/<identifier>/events/<event-name>.json`. A mock of the
context object is passed as the second argument.

Setting the option `--alias` to an empty string (`--alias ""`) will invoke the `LATEST` version of the Lambda.
