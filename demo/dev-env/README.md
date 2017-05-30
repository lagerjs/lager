# Development environment

This folder contains a basic Myrmex project that should be used for contributions to Myrmex and its core plugins.

If you did not arrived here by mistake, thanks for contributing to Myrmex! :tada:

Executing the `run.sh` script in this folder will open a shell inside a Docker :whale: container. There, you have access to a
empty Myrmex :ant: project that can be used to test modifications applied to Myrmex modules hosted in this repository.

The content of the `packages` folder of this repository in mounted in the `/home/myrmex/.node/lib/node_modules/` folder of the
container like if the packages had been installed globally. Inside the Myrmex project, the packages are available via a
symbolic link, like if they had been installed in the project via `npm link`.

Therefore, altering the content of `packages/*` in the repository will affect the modules installed inside the container.    

To perform tests on a particular Myrmex module, you could want to desactivate unnecessary modules via the file `myrmex.json`.
Please do not commit these changes.

If you want to perform deployments on AWS, copy the `env.list.example` file into `env.list` and edit it with your AWS
credentials.

Every file created in this folder will be ignored by git.
