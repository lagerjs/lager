Lager
===

[![Build Status](https://travis-ci.org/lagerjs/lager.svg)](https://travis-ci.org/lagerjs/lager)
[![bitHound Overall Score](https://www.bithound.io/github/lagerjs/lager/badges/score.svg)](https://www.bithound.io/github/lagerjs/lager)
[![bitHound Dependencies](https://www.bithound.io/github/lagerjs/lager/badges/dependencies.svg)](https://www.bithound.io/github/lagerjs/lager/dev/dependencies/npm)
[![bitHound Code](https://www.bithound.io/github/lagerjs/lager/badges/code.svg)](https://www.bithound.io/github/lagerjs/lager)
[![codecov](https://codecov.io/gh/lagerjs/lager/branch/dev/graph/badge.svg)](https://codecov.io/gh/lagerjs/lager)

AWS Lambda + API Gateway + OpenAPI specification === *Lager*

The **Lambda API Gateway Endpoints Router**

`Lager` is a framework created to simplify the conception and the deployment of applications with Amazon API Gateway and Amazon Lambda.
It is composed of a plugin system and a command line. In fact, `lager` does not have any dependency with AWS in it's core.

Each plugin installed in a project extends the capabilities of `Lager` and can add new sub-commands to the command line.
*Official* plugins have a node package identifier in the `@lager` namespace. Here is a list of the main ones:

*   `@lager/api-gateway`
*   `@lager/lambda`
*   `@lager/iam`

Installation
---

**Prerequisite**: `node` (version 4 minimum) and `npm` must be installed.

The lager command line has it's own node module. We install it globally.

```bash
npm install -g @lager/cli
```

Test that the `lager` command line is correctly installed.

```bash
# This command will show the available options and sub-commands
lager -h
```

![lager -h](https://raw.githubusercontent.com/lagerjs/lager/master/img/lager-h.png)

The only available sub-command for now will be `lager new`. We can see its options and arguments definition with `lager new -h`.

Create a new project
---

`lager new` is the command that creates new projects. `lager new -h` outputs its usage information.

![lager new -h](https://raw.githubusercontent.com/lagerjs/lager/master/img/lager-h.png)

*   It has one argument: the name of the project
*   It has one option: '-p, --plugins <plugins-names>', where the value is a comma-separated list of plugins that will be used by the project.

If the argument and/or the option is not specified, we will be prompted to choose a value.

```bash
# Using the command without option and argument, the user will be prompted to give information about the project configuration
lager new
```

![lager new prompt](https://raw.githubusercontent.com/lagerjs/lager/master/img/prompt.gif)

If the argument and the option are both specified, the project will be created without needing a user interaction.

```bash
# This command will create a lager project with the api-gateway and the node-lambda plugins without the need to prompt the user
lager new my-project -p @lager/api-gateway,@lager/node-lambda
```

`lager new` will create a project folder, install the later version of `Lager` and the specified plugins and create a `lager.json` configuration file.

Once the project is created we can enter its folder and access to sub-commands provided by the plugins.

![lager -h](https://raw.githubusercontent.com/lagerjs/lager/master/img/lager-h2.png)
