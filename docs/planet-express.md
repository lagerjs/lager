# Create the project
lager new planet-express -p @lager/iam,@lager/api-gateway,@lager/node-lambda
cd planet-express

# Create lambda execution role
lager create-role PlanetExpressLambdaExecution -p "LambdaBasicExecutionRole"

# Create lambda invocation role
lager create-role PlanetExpressLambdaInvocation -p "APIGatewayLambdaInvocation"

# Create lambda function
lager create-node-module log
lager create-node-module data-access -d log
lager create-node-lambda api-generic -t 20 -m 256 -r PlanetExpressLambdaExecution --template api-endpoints --modules data-access,log

# Create APis
lager create-api bo        -t "Back Office" -d "Planet Express API for Back Office"
lager create-api sender    -t "Sender"      -d "Planet Express API for sender application"
lager create-api recipient -t "Recipient"   -d "Planet Express API for recipient application"

# Create endpoints
lager create-endpoint /delivery get -a bo,recipient,sender -s "View a delivery" -c "application/json" -p "application/json" --auth none --credentials PlanetExpressLambdaInvocation
lager create-endpoint /delivery patch -a bo -s "View a delivery" -c "application/json" -p "application/json" --auth none --credentials PlanetExpressLambdaInvocation
lager create-endpoint /delivery put -a bo,sender -s "View a delivery" -c "application/json" -p "application/json" --auth none --credentials PlanetExpressLambdaInvocation
lager create-endpoint /delivery delete -a bo,recipient -s "View a delivery" -c "application/json" -p "application/json" --auth none --credentials PlanetExpressLambdaInvocation

# Deploy
lager deploy-apis bo,sender,recipient -r us-east-1 -s v0 -e DEV
