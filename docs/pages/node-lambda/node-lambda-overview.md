---
title: An overview of the @lager/lambda plugin
keywords: lager, lambda
tags: [lambda, getting_started]
summary: "The @lager/lambda plugin allows to define Lambdas, manage their dependencies to portions of your application and perform deployments"
sidebar: lambda_sidebar
permalink: lambda-overview.html
folder: lambda
---

## Prerequisites

To use the `@lager/lambda` plugin, you should have a minimal knowledge about [AWS Lambda](https://aws.amazon.com/lambda/) and Node.js.

## Installation

In the root folder of a lager project:

```bash
npm install @lager/lambda
```

Then enable the plugin in the `lager.json` config file:

```json
{
  "name": "my-app",
  "plugins": [
    "@lager/lambda"
  ]
}
```

Once the plugin is installed and enabled in the project, the `lager` command line will provide new sub-commands to manage and deploy node Lambdas.


## Project anatomy

The content managed by `@lager/lambda` is located in an `lambda` directory in the root directory of the project.

Out of the box, `@lager/lambda` allows you to separate the definition of Lambdas from the logic of the application by providing a specific
place to write node modules but you are not obliged to use it. `@lager/lambda` helps you to manage and deploy your Lambdas but lets you be
responsible of the implementation of your application.

The directory `lambda/lambdas` contains the Lambdas definitions. Each of its sub-directory has the name of a Lambda identifier and contains a
`config.json` file and the code of the Lambda.

The `config.json` file allows you to define the timeout, the memory and the role of the Lambda. It also allows to select some modules as dependencies
of the Lambda.

The directory `lambda/modules` contains the modules of the project. For example, some of these modules could be named `log`, or `data-access`
or `authorization` etc...
Each module should have a clear responsibility so that each Lambda can embed only the code it needs.

As an example is more easy to understand, that is what a project structure could looks like:

```text
lambda
├── lambdas                         The Lambdas defined by the application
|   ├── my-lambda                   The name of this directory is the identifier of a Lambda
|   |   ├── config.json             The configuration of the Lambda (memory, timeout, execution role...)
|   |   ├── lambda.js               A node module that exposes the handler
|   |   └── package.json            It is possible to install the dependencies of the Lambda here, but we recommend to write as little as possible
|   |                               code in this directory to make the code more modular and more testable
|   └── my-other-lambda
|       ├── config.json
|       └── lambda.js
└── modules                         The node modules of the application - they can be added as a dependency of a Lambda in its config.json file
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
    "Role": "arn:aws:iam::123456789012:role/MyRole"
  },
  "modules": [
    "data-access",
    "log"
  ]
}
```

The `package.json` of a module supports a Lager extension to declare dependencies with other modules:

```json
{
  "x-lager": {
    "dependencies": [
      "log"
    ]
  },
  "name": "data-access",
  "version": "0.0.0",
  "description": "The layer of my application that has access to the database",
  "author": "me",
  "license": "MIT",
  "dependencies": {},
  "devDependencies": {}
}
```
