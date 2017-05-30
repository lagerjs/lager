#!/bin/bash
docker run \
       -u root \
       --env HOST_UID=`id -u` \
       --env HOST_GID=`id -g` \
       --env-file ./env.list \
       -v `pwd`:/home/myrmex/app \
       -v `pwd`/../../packages/cli:/home/myrmex/.node/lib/node_modules/myrmex \
       -v `pwd`/../../packages:/home/myrmex/.node/lib/node_modules/@myrmex \
       -it \
       myrmex
