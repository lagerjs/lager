---
title: Configuration of a Lager project
keywords: lager, core
tags: [getting_started, configuration]
summary: "Lager allows to configure your project in various ways."
sidebar: core_sidebar
permalink: core-lager-config.html
folder: core
---

The `lager.json` file
---

In the root directory of a Lager project, there is a `lager.json` file that contains the base configuration of the project.

A minimal `lager.json` file looks like this:

```json
{
  "name": "planet-express",
  "plugins": [
    "@lager/iam",
    "@lager/api-gateway",
    "@lager/lambda",
    "./plugins/my-plugin"
  ]
}
```

*   `name`: the identifier of the project.
*   `plugins`: the list of plugins that Lager has to register. A Lager plugin can be a node module installed via npm or defined in the project.
     A plugin can be installed but will not be registered by Lager if it is not specified here.

Splitting the configuration into various files
---

Using environment variables to override the configuration
---
