lager new lambda-profiling @lager/iam @lager/node-lambda

lager create-role LambdaInspection -p LambdaBasicExecutionRole

lager deploy-roles LambdaInspection -e DEV -s v0

lager create-node-module inspection

lager create-node-lambda config-128 -t 30 -m 128 --modules inspection -r LambdaInspection --template none

lager create-node-lambda config-512 -t 30 -m 512 --modules inspection -r LambdaInspection --template none

lager create-node-lambda config-1536 -t 30 -m 1536 --modules inspection -r LambdaInspection --template none

lager deploy-node-lambdas config-128 config-1536 config-512 config-1536

lager create-node-module require-profiling
