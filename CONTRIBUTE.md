Contribute
===

Rules
---

*   Follow the ROADMAP.md file for priorities and task t-shirt sizing
*   Update the specs and docs along with the code
*   Write / rewrite ES6 code
*   Follow the rules of the .jshint.rc and .mdastrc files
*   Respect convention for case: ConstructorFunctionName, instanceName, functionName, node-module-name
*   Code coverage objective: 80%

Setup dev environment
---

The repository comes with a docker-compose configuration that allows to quickly test modification on the lager command line.

Indeed, it installs the `lager` command line like `npm install @lager/lager -g` would do and comes with a test application.

### Prerequisites

*   Install docker and docker-compose
*   `git clone git@github.com:lagerjs/lager.git`
*   `cd lager`
*   `npm install`
*   `cp docker-compose.env.example docker-compose.env`
*   configure the file `docker-compose.env` with AWS credentials that you want to use to perform deployment tests

### Launching the development environment

```bash
docker-compose run node zsh
```

You will open a shell in a container as the user `lager`, in the root directory of a sample project. Lager will be installed globally. Test it with the following command.

```bash
lager -h
```

### Unit tests container

!! TODO !! improve test runner and document it

~~There is a specific container to run tests, so we can define a different execution environment
and be sure to isolate the execution of tests.~~

```bash
docker-compose run test
```
