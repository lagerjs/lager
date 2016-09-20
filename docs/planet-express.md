Create and configure several APIs with one `Lager` application
===

The need
---

**Planet Express** is a space delivery company. They have two types of customers :

*   *Senders* like the **Slurm factory** that need to deliver products
*   *Recipients* like the **Mars Vegas Casinos** that receive these products

**Planet Express**, as a futurist company, wants to provide APIs, web applications and mobile applications for their customers to create and track deliveries.

*   *Senders* like the **Slurm factory** need an API to create and track deliveries
*   *Recipients* like the **Mars Vegas Casinos** need an API to track and validate the reception of deliveries
*   **Planet Express** also need an API for its *Back Office* application that manage the deliveries

Following REST principles, an simple API implementing these functionalities should expose these endpoints :

*   `PUT /delivery` should perform the creation of a new delivery
*   `GET /delivery/{id}` should allow to track a delivery
*   `PATCH /delivery/{id}` should perform modifications on a delivery
*   `DELETE /delivery/{id}` should delete a delivery

To simplify the application, we do not manage authentication and authorization, a *sender* cannot modify a delivery once created and a *recipient* deletes a
delivery when it receives it.

**Planet Express** wants to provide an `OpenAPI` (aka `swagger`) specification to document the endpoints so *senders*, *recipients* and the *back office*
development teams can integrate the service. To avoid exposing and documenting endpoints not needed by API consumers, **Planet Express** would like to
have one API for each type of client application : `sender`, `recipients` and `back-office`.

These three APIs share the same code base. The `back-office` API will provide access to all functionalities while the consumers of the `sender` and the
`recipient` APIs will only have access to endpoints that are useful for them.

|                          | `sender` | `recipient` | `back-office` |
| ------------------------ | -------- | ----------- | ------------- |
| `PUT /delivery`          | X        |             | X             |
| `GET /delivery/{id}`     | X        | X           | X             |
| `PATCH /delivery/{id}`   |          |             | X             |
| `DELETE /delivery/{id}`  |          | X           | X             |

We will not see the implementation of authentication and authorization here. Neither will we see the implementation of the data access. These are aspects
of the application that do not rely on `Lager`. They are implemented in `node.js` modules that could run in any execution environment.

The creation of the application with `Lager`
---

### Create the project

```bash
lager new planet-express -p @lager/iam,@lager/api-gateway,@lager/node-lambda
cd planet-express
```

### Create lambda execution role

```bash
lager create-role PlanetExpressLambdaExecution -p "LambdaBasicExecutionRole"
lager deploy-roles PlanetExpressLambdaExecution
```

### Create lambda invocation role

```bash
lager create-role PlanetExpressLambdaInvocation -p "APIGatewayLambdaInvocation"
lager deploy-roles PlanetExpressLambdaInvocation
```

### Create lambda function

```bash
lager create-node-module log
lager create-node-module data-access -d log
lager create-node-lambda api-generic -t 20 -m 256 -r PlanetExpressLambdaExecution --template api-endpoints --modules data-access,log
```

### Create APis

```bash
lager create-api bo        -t "Back Office" -d "Planet Express API for Back Office"
lager create-api sender    -t "Sender"      -d "Planet Express API for sender application"
lager create-api recipient -t "Recipient"   -d "Planet Express API for recipient application"
```

### Create endpoints

```bash
lager create-endpoint /delivery get -a bo,recipient,sender -s "View a delivery" -c "application/json" -p "application/json" --auth none --credentials PlanetExpressLambdaInvocation -l api-generic
lager create-endpoint /delivery patch -a bo -s "View a delivery" -c "application/json" -p "application/json" --auth none --credentials PlanetExpressLambdaInvocation -l api-generic
lager create-endpoint /delivery put -a bo,sender -s "View a delivery" -c "application/json" -p "application/json" --auth none --credentials PlanetExpressLambdaInvocation -l api-generic
lager create-endpoint /delivery delete -a bo,recipient -s "View a delivery" -c "application/json" -p "application/json" --auth none --credentials PlanetExpressLambdaInvocation -l api-generic
```

### Deploy

```bash
lager deploy-apis bo -r us-east-1 -s v0 -e DEV
lager deploy-apis sender -r us-east-1 -s v0 -e DEV
lager deploy-apis recipient -r us-east-1 -s v0 -e DEV
```
