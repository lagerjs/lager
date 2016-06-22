FROM lagerjs/node-dev

### If your uid/gid is different than 1000, you can modify the uid/gid of the lager user
### in the container by uncommenting these lines and setting the appropriate value (change-uid <NEW_UID> [NEW_GID])
### Then run `docker-compose build` in the `dev-app` directory to re-build the docker image
### Please take care to NOT COMMIT this modification
# USER root
# RUN change-uid 1234 5678
# USER lager

# Common packages for tests
RUN npm install -g mocha istanbul

# Create symlink to enable the Lager cli
RUN cd ~/.node/bin && ln -s ../lib/node_modules/@lager/lager/src/bin/lager lager

CMD ["npm", "test"]
