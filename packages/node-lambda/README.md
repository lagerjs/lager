Lager `node-lambda` plugin
===

[![Build Status](https://travis-ci.org/lagerjs/node-lambda.svg)](https://travis-ci.org/lagerjs/node-lambda)
[![bitHound Overall Score](https://www.bithound.io/github/lagerjs/node-lambda/badges/score.svg)](https://www.bithound.io/github/lagerjs/node-lambda)
[![bitHound Dependencies](https://www.bithound.io/github/lagerjs/node-lambda/badges/dependencies.svg)](https://www.bithound.io/github/lagerjs/node-lambda/master/dependencies/npm)
[![bitHound Code](https://www.bithound.io/github/lagerjs/node-lambda/badges/code.svg)](https://www.bithound.io/github/lagerjs/node-lambda)
[![codecov](https://codecov.io/gh/lagerjs/node-lambda/branch/master/graph/badge.svg)](https://codecov.io/gh/lagerjs/node-lambda)

A lager plugin to define AWS Lambda functions and deploy them.

Prerequisites
---

To use the `@lager/node-lambda` plugin, you should have a minimal knowledge about [AWS Lambda](https://aws.amazon.com/lambda/)
and Node.js.

Installation
---

In the root folder of a lager project:

```bash
npm install @lager/node-lambda
```

Then enable the plugin in the `lager.json` config file:

```json
{
  "name": "my-app",
  "plugins": [
    "@lager/node-lambda"
  ]
}
```

Once the plugin is installed and enabled in the project, the `lager` command line will provide new sub-commands to manage and deploy node Lambdas.

CLI usage
---

The Lager CLI must be installed to use `@lager/node-lambda` subcommands. When called within a Lager project with the `@lager/node-lambda`
plugin installed and activated, the `lager` command will be enriched with subcommands to work with `@lager/node-lambda`.

```bash
npm install -g @lager/cli

# Inside a Lager project directory, list available subcommands.
lager -h

# It is possible to have a description of each subcommand. For example:
lager create-node-lambda -h
```

The `create-node-module` and `create-node-lambda` sub-commands help to create new Lambdas definitions.

The `deploy-node-lambdas` sub-command allows to deploy one or more Lambdas in AWS.

Project anatomy
---

The content managed by `@lager/node-lambda` is located in an `node-lambda` directory in the root directory of the project.

Out of the box, `@lager/node-lambda` allows you to separate the definition of Lambdas from the logic of the application by providing a specific
place to write node modules but you are not obliged to use it. `@lager/node-lambda` helps you to manage and deploy your Lambdas but let you be
responsible of the implementation of your application.

The directory `node-lambda/lambdas` contains the Lambdas definitions. Each of its sub-directory has the name of a Lambda identifier and contains a
`config.json` file and the code of the Lambda.

The `config.json` file allows you to define the timeout, the memory and the role of the Lambda. It also allows to select some modules (see below)
as dependencies of the Lambda.

The directory  `node-lambda/modules` contains the modules of the project. Some of these modules could be named `log`, or `data-access` or `authorization` etc...
Each module should have a clear responsibility so that each Lambda can embed specific code.

As an example is more easy to understand, that is what a project structure could looks like:

```text
node-lambda
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
  }
  ... rest of the package information
}
```


Deployment
---

The command `lager deploy-lambdas` allows to deploy one or more Lambdas. Be sure to run `npm install` in all your modules before to use it because
`node-lambda/modules` will not do it for you (for now ...).
