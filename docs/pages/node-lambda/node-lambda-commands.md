---
title: Command line of the @lager/node-lambda plugin
keywords: lager, node-lambda, command-line
tags: [node-lambda, command-line]
summary: "The @lager/node-lambda plugin add some sub-commands to the Lager CLI"
sidebar: node-lambda_sidebar
permalink: node-lambda-commands.html
folder: node-lambda
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
