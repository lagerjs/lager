Contribute
===

Rules
---

*   Follow the ROADMAP.md file for priorities and task t-shirt sizing
*   Update the specs and docs along with the code
*   Write / rewrite ES6 code compatible with node v4
*   Follow the rules of the .jshint.rc and .mdastrc files
*   Respect conventions for case: ConstructorFunctionName, instanceName, functionName, node-module-file-name.js
*   Code coverage objective: 80%

Setup dev environment
---

The repository comes with a docker-compose configuration that allows to quickly test modification on the lager command line.

Indeed, it installs the `lager` command line like `npm install @lager/lager -g` would do and comes with a test application.

### Prerequisites

*   Install docker and docker-compose
*   Clone the repo `git clone git@github.com:lagerjs/lager.git`
*   Install dependencies `cd lager/src && npm install`
*   Setup environment for the development application `cd ../dev-app && cp docker-compose.env.example docker-compose.env`
*   Configure the file `docker-compose.env` with AWS credentials that you want to use to perform deployment tests

### Building and launching the environment for the development application

The lager repository comes with a dockerized environment that allows to quickly test modifications.

To have appropriate permissions on the files in the container, the user in the container must have the same `uid/gid` that the user that owns the repository on the host machine.
Check the `uid/gid` of your user on the host machine:

```bash
$ id
uid=1000(alexis) gid=1000(alexis) groups=1000(alexis),27(sudo),126(docker)
```

If your user has a `uid/gid` different than 1000, you can edit `dev-app/docker-compose/nodejs/Dockerfile` and uncomment these lines:

```
### If your uid/gid is different than 1000, you can modify the uid/gid of the lager user
### in the container by uncommenting these lines and setting the appropriate value (change-uid <NEW_UID> [NEW_GID])
### Then run `docker-compose build` in the `dev-app` directory to re-build the docker image
### Please take care to NOT COMMIT this modification
# USER root
# RUN change-uid 1234
# USER lager
```

Rebuild the docker images if necessary:

```bash
$ # In the directory `dev-app`
$ docker-compose build
```

If/when the `uid/gid` matches, run a shell in a container of the node image:

```bash
$ # In the directory `dev-app`
$ docker-compose run node zsh
```

You will be logged with the user `lager`, in the root directory of a sample project. Lager will be installed globally. Test it with the following command.

```bash
$ # Inside the node container
$ lager -h
```

### Unit tests container

!! TODO !! improve test runner and document it

~~There is a specific container to run tests, so we can define a different execution environment
and be sure to isolate the execution of tests.~~

```bash
$ docker-compose run test
```
