---
title: Definition of APIs with @lager/api-gateway plugin
keywords: lager, api-gateway
tags: [api-gateway]
summary: "The @lager/api-gateway plugin allows to define several APIs for a project"
sidebar: api-gateway_sidebar
permalink: api-gateway-apis.html
folder: api-gateway
---

## Creating APIs

Lager allows to define several APIs for a project. Indeed, An application should be able to expose several APIs for different consumers.
For example an API for a back-office, an other one for a mobile application and a yet another one for third party consumers.

To add a new API to a Lager project, we create a directory `ai-gateway/apis/my-new-api` where `my-new-api` is an identifier that will be used by Lager.

In this  directory, we create a file `spec.json`. This file is a Swagger specification without necessarily writing `paths` of `definitions` sections.
Indeed, these sections should be dynamically written by Lager plugins.

For example, an application that exposes an API for a back office and another API for a mobile application would have this directory structure:

```text
└── api-gateway
    └── apis
        ├── back-office                   The name of this directory is the identifier of an API
        |   └── spec.json                 The API's Swagger specification (without endpoints definitions)
        └── mobile-app
            └── spec.json
```

## Writing an API specification

Lager uses the Swagger specification but separate the specification of endpoints to associate them to various APIs. An API `spec.json` file will then contain
a small portion of Swagger specification.

```javascript
{
  "swagger": "2.0",
  "info": {
    "title": "Back Office",
    "description": "The API of the Back Office"
  },
  "schemes": [
    "https"
  ],
  "host": "API_ID.execute-api.REGION.amazonaws.com",      // This value will be overwritten during deployment
  "paths": {},
  "definitions": {}
}
```
