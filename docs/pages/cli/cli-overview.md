---
title: The Lager command line interface
keywords: lager, cli
tags: [getting_started, cli]
sidebar: cli_sidebar
permalink: cli-overview.html
folder: cli
---

The Lager cli comes in its own npm module and must be installed globally.

```bash
npm install -g @lager/cli
```

The cli is based on [`comquirer`](https://github.com/AlexisNo/comquirer#readme) that is itself based on
[`commander`](https://github.com/tj/commander.js#readme) for the parsing of commands arguments and
[`inquirer`](https://github.com/SBoudrias/Inquirer.js#readme) for the interactive prompt.

`@lager/cli` itself only provide one command that is used to create new Lager projects: `lager new`.

When invoked from a Lager project directory, the cli detects it and loads the *Lager instance*. Then, it fires an event `registerCommands` passing the
instance of `comquirer` as an argument. The plugins installed in the project can listen for this event and inject new commands in the cli.

Every command implemented in a Lager plugin should be able to be invoked programmatically, passing parameters as arguments and options.

Every command implemented in a Lager plugin should allow to fill parameters via the interactive prompt.
