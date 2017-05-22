---
title: Command line of the @lager/lambda plugin
keywords: lager, lambda, command-line
tags: [lambda, command-line]
summary: "The @lager/lambda plugin add some sub-commands to the Lager CLI"
sidebar: lambda_sidebar
permalink: lambda-commands.html
folder: lambda
---

The Lager CLI must be installed to use `@lager/lambda` subcommands. When called within a Lager project with the `@lager/lambda`
plugin installed and activated, the `lager` command will be enriched with subcommands to work with `@lager/lambda`.

```bash
npm install -g @lager/cli

# Inside a Lager project directory, list available subcommands.
lager -h

# It is possible to have a description of each subcommand. For example:
lager create-lambda -h
```

The `create-node-module` and `create-lambda` sub-commands help to create new Lambdas definitions.

The `deploy-lambdas` sub-command allows to deploy one or more Lambdas in AWS.
