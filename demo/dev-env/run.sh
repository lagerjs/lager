docker run \
       -u root \
       --env HOST_UID=`id -u` \
       --env-file ./env.list \
       -v `pwd`:/home/lager/app \
       -v `pwd`/../../packages/cli:/home/lager/.node/lib/node_modules/@lager/cli \
       -v `pwd`/../../packages/lager:/home/lager/.node/lib/node_modules/@lager/lager \
       -v `pwd`/../../packages/iam:/home/lager/.node/lib/node_modules/@lager/iam \
       -v `pwd`/../../packages/node-lambda:/home/lager/.node/lib/node_modules/@lager/node-lambda \
       -v `pwd`/../../packages/api-gateway:/home/lager/.node/lib/node_modules/@lager/api-gateway \
       -it \
       lager/dev
