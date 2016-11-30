---
title: Lager documentation
keywords: lager documentation homepage
tags: [getting_started]
sidebar: home_sidebar
permalink: index.html
summary: Documentation under construction.
---

AWS Lambda + API Gateway + OpenAPI specification === *Lager*

The **Lambda API Gateway Endpoints Router**

Lager is a framework created to simplify the conception and the deployment of serverless applications with
[`Amazon API Gateway`](https://aws.amazon.com/api-gateway/) and [`AWS Lambda`](https://aws.amazon.com/lambda/).
It is composed of *a plugin system and a command line*. In fact, Lager does not have any dependency with AWS in it's core.

Each plugin installed in a project extends the capabilities of Lager and can add new sub-commands to the command line.
*Official* plugins have a node package identifier in the `@lager` namespace. Here is a list of the main ones:

*   [`@lager/api-gateway`](https://www.npmjs.com/package/@lager/api-gateway) to define endpoints, associate them withs APIs and deploy them in
    `Amazon API Gateway`
*   [`@lager/node-lambda`](https://www.npmjs.com/package/@lager/node-lambda) to deploy node functions in `AWS Lambda`
*   [`@lager/iam`](https://www.npmjs.com/package/@lager/iam) to manage `AWS IAM` (Identity and Access Management) policies and roles

These plugins can interact with each other but can also be used independently.

Installation
---

**Prerequisite**: `node` (version 4 minimum) and `npm` must be installed.

The `lager` command line has it's own node module. We install it globally.

```bash
npm install -g @lager/cli
```

We can check that the `lager` command line is correctly installed.

```bash
# This command will show the available options and sub-commands
lager -h
```

![lager -h](https://raw.githubusercontent.com/lagerjs/lager/master/img/lager-h.png)

The only available sub-command for now is `lager new`. We can see its options and arguments definition using `lager new -h`.

Create a new project
---

`lager new` is the command that creates new projects.
If it is called without argument and/or option, it will provide a prompt to define the configuration of the project.

```bash
# Using the command without option and argument, the user will be prompted to give information about the project configuration
lager new
```

![lager new prompt](https://raw.githubusercontent.com/lagerjs/lager/master/img/prompt.gif)

### Installation result

`lager new` will perform 3 operations:

*   create a project folder
*   install the latest version of Lager and the project's plugins using `npm install --save`
*   create a `lager.json` configuration file

Once the project is created we can enter its folder and access to sub-commands added to the `lager` command by the project's plugins.

![lager -h](https://raw.githubusercontent.com/lagerjs/lager/master/img/lager-h2.png)

Working on a Lager project
---

This documentation is currently under construction. This section will contain links to the documentation of plugins and some use case examples.

*   [Overview of Lager and it's main plugins](core-overview.html)
*   [Create an application exposing several APIs](planet-express.html)

Installing `@lager/cli` and testing it helps to discover Lager too.
