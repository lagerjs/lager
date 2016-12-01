Lager `iam` plugin
===

[![Build Status](https://travis-ci.org/lagerjs/iam.svg)](https://travis-ci.org/lagerjs/iam)
[![bitHound Overall Score](https://www.bithound.io/github/lagerjs/iam/badges/score.svg)](https://www.bithound.io/github/lagerjs/iam)
[![bitHound Dependencies](https://www.bithound.io/github/lagerjs/iam/badges/dependencies.svg)](https://www.bithound.io/github/lagerjs/iam/master/dependencies/npm)
[![bitHound Code](https://www.bithound.io/github/lagerjs/iam/badges/code.svg)](https://www.bithound.io/github/lagerjs/iam)
[![codecov](https://codecov.io/gh/lagerjs/iam/branch/master/graph/badge.svg)](https://codecov.io/gh/lagerjs/iam)

A lager plugin to define AWS IAM roles and policies and deploy them.

Installation
---

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
