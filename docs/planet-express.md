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
lager create-api

# Create endpoints
lager create-endpoint

# Deploy
lager deploy-apis
