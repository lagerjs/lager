```text
├── apis                              The APIs defined by the application
|   ├── {an-api-identifier}           A custom identifier for the API
|   |   └── spec.json                 The API's specification that will be completed by Lager
|   └── {another-api-identifier}
|       └── spec.json
├── endpoints                         Contains the definition of all endpoints
|   └── <path>  
|       ├── spec.json
|       └── <to>
|           ├── spec.json
|           └── <resource>
|               ├── spec.json
|               └── <HTTP_METHOD>     GET|POST|PUT|PATCH|DELETE|OPTION
|                   ├── index.js      A module returning a simple node function that will be used
|                   |                 as the *callback* parameter of the AWS lambda *handler*
|                   └── spec.json     The endpoint's specification will be the result of the fusion
|                                     of all *spec.json* files in the path
├── lambdas
|   ├── {a-lambda-identifier}         A custom identifier for the lambda
|   |   ├── config.json               Configuration of the lambda (memory, timeout, dependencies, role ...)
|   |   └── router.js                 A module returning a simple node function that determines the function to
|   |                                 execute depending on the parameters received from API Gateway
|   |                                 (ie: the *event* parameter of the AWS lambda *handler*)
|   └── {another-lambda-identifier}
|       ├── config.json
|       └── router.js
└── models
```
