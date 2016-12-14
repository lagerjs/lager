# Development environment

This applications should be used for contributions to Lager and its core plugins.

`bash run.sh` runs a shell inside a Docker container. There, you have access to a empty Lager project that can be used to test the code of this repository.
Some docker volumes mount the content of the `packages` folder of the repository inside `/home/lager/.node/lib/node_modules/` like it the packages had been
installed globally. Inside the Lager project, the packages are available via a symbolic link, as installed via `npm link`.

Therefore, altering the content of `packages/*` in the repository will affect the modules installed inside the container.    
