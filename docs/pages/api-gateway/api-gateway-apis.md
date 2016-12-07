---
title: Definition of APIs with @lager/api-gateway plugin
keywords: lager, api-gateway
tags: [api-gateway]
summary: "The @lager/api-gateway plugin allows to define several APIs for a project"
sidebar: api-gateway_sidebar
permalink: api-gateway-apis.html
folder: api-gateway
---

Lager allows to define several APIs for a project. Indeed, An application should be able to expose several APIs for different consumers.
For example an API for a back-office, an other one for a mobile application and a yet another one for third party consumers.

To add a new API to a Lager project, we create a directory `ai-gateway/apis/my-new-api` where `my-new-api` is an identifier that will be used by Lager.

In this  directory, we create a file `spec.json`. This file is a Swagger specification without necessarily writing `paths` of `definitions` sections.
Indeed, these sections should be dynamically written by Lager plugins.

Example:

```javascript
{
  "swagger": "2.0",
  "info": {
    "title": "Back Office",
    "description": "Planet Express API for Back Office"
  },
  "schemes": [
    "https"
  ],
  "host": "API_ID.execute-api.REGION.amazonaws.com",      // This value will be overwritten during deployment
  "paths": {},
  "definitions": {}
}
```
