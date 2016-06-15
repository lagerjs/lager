The `endpoints` folder contains the base specification of endpoints defined by the application.

To define an endpoint, create a directory structure that follows the resource path.
In this structure, create directories named by HTTP methods (GET, POST, PUT, PATCH or DELETE).
In the HTTP method directories, create a file `spec.json` that contains the OpenAPI specification of the endpoint.

You can also create `spec.json` files higher in the directory structure. It will be merged with the final `spec.json` file. This allows to write specifications that apply to several endpoint only once.

For example, an application that creates and track deliveries could provide these endpoints:

*  `POST   /delivery` to create a new delivery
*  `GET    /delivery/{id}` to track a delivery
*  `PATCH  /delivery/{id}` to update the status of a delivery
*  `DELETE /delivery/{id}` to delete a delivery

The structure of the `endpoints` folder of this application should look like this:

```
└── endpoints
    └── delivery
        ├── DELETE
        |   └── spec.json
        ├── GET
        |   └── spec.json
        ├── PATCH
        |   └── spec.json
        ├── POST
        |   └── spec.json
        └── spec.json       // The specification written in this file will apply
                            // to all endpoints specified in subdirectories
```
