#!/bin/bash
docker run \
       -u root \
       --env HOST_UID=`id -u` \
       --env-file ./env.list \
       -v `pwd`:/home/lager/app \
       -it \
       lager/dev
