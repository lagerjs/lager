#!/bin/bash
docker run \
       -u root \
       --env HOST_UID=`id -u` \
       --env HOST_GID=`id -g` \
       --env-file ./env.list \
       -v `pwd`:/home/myrmex/app \
       -it \
       myrmex/dev
