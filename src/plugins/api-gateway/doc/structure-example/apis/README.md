The `apis` folder contains the base specification of APIs defined by the application.

In Lager, you can define several APIs for an application, and select corresponding endpoints.

For example, an application that track deliveries could provide 3 different API that are
sharing some of their endpoints:

*   A `bo` API for the back-office of the delivery company
*   A `sender` API for customers that send packages
*   A `receiver` API for customers that receive packages

The endpoints should be configured to apply to different APIs:

*  `POST   /delivery` should be available in APIs `bo` and `sender` to create new delivery
*  `GET    /delivery/{id}` should be available in APIs `bo`, `sender` and `receiver` to track a delivery
*  `PATCH  /delivery/{id}` should be available in APIs `bo`, `receiver` to update the status of a delivery to **received**
*  `DELETE /delivery/{id}` should be available in API `bo` to delete an old delivery

The structure of the `apis` folder of this application should look like this:

```
└── apis
    ├── bo
    |   └── spec.json
    ├── receiver
    |   └── spec.json
    └── sender
        └── spec.json
```
