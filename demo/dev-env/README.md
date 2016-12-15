# Development environment

This folder contains a basic Lager project that should be used for contributions to Lager and its core plugins.

If you did not arrived here by mistake, thanks for contributing to Lager! :tada:

Executing `run.sh` runs a shell inside a Docker :whale: container. There, you have access to a empty Lager :beers: project that
can be used to test modifications applied to this repository.

The content of the `packages` folder of this repository in mounted in the `/home/lager/.node/lib/node_modules/` folder of the 
container like if the packages had been installed globally. Inside the Lager project, the packages are available via a symbolic
link, like if they had been installed in the project via `npm link`.

Therefore, altering the content of `packages/*` in the repository will affect the modules installed inside the container.    

To perform tests on a particular Lager module, you could want to desactivate unnecessary modules via the file `lager.json`.
Please do not commit these changes.

Every file created in this folder will be ignored by git.
