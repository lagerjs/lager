This folder must contain an API specification in a file named `spec.json`.

It is a basic OpenAPI specification without necessarily writing `paths` of `definitions` sections.
Indeed, these sections should be dynamically written by Lager plugins.

Example:

```javascript
{
  "x-lager": {
    "identifier": "my-api"                          // the name of the API in API Gateway will use this identifier
                                                    // if not specified, the folder name will be used
  },
  "info": {},
  "schemes": ["https"],                             // API Gateway only support https, this value will be generated
  "host": "API_ID.execute-api.REGION.amazonaws.com" // this value will be generated
}
```
