---
title: An overview of the @lager/iam plugin
keywords: lager, iam
tags: [iam, getting_started]
summary: "The @lager/iam plugin allows to define and deploy AWS IAM policies and roles.
It also allows to simplify the configuration of other plugins by using role names instead of ARNs"
sidebar: iam_sidebar
permalink: iam-overview.html
folder: iam
---

## Prerequisites

To use the `@lager/iam` plugin, you should have a minimal knowledge about [AWS Identity and Access Management](https://aws.amazon.com/iam/).

## Installation

In the root folder of a lager project:

```bash
npm install -g @lager/iam
```

Then enable the plugin in the `lager.json` config file:

```json
{
  "name": "my-app",
  "plugins": [
    "@lager/iam"
  ]
}
```
