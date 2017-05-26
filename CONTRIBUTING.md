Contribute
===

If you are reading this, welcome aboard! :beers:

You can contribute to Myrmex by proposing pull requests on the repository or by creating your own plugins to extend Myrmex's
functionalities.

If you want to create a Myrmex plugin
---

*   Tell us about your idea by creating a github issue
*   We would be very pleased to give you support to archive your goal
*   Use a namespace for new commands: `myrmex my-plugin:command [options] arguments`
*   Use a namespace for new hooks: `my-plugin:i-can-fire-a-new-myrmex-hook`

If you want to contribute to Myrmex or one of its core plugins
---

*   Comment on the issue you want to work on or create one if it does not exist
*   Update the specs and docs along with the code
*   Write / rewrite ES6 code compatible with node v4
*   Follow the rules of the `.eslintrc` and `.remarkrc` files (You can test using the command `npm run lint`)
*   Respect case conventions: `ConstructorFunctionName`, `instanceName`, `functionName`, `node-module-file-name.js`
*   Code coverage objective: 80% minimum

Setup your development environment
---

The Myrmex core packages belong to a monorepo managed with [Lerna](https://github.com/lerna/lerna). The monorepo comes with a
development project that runs in a docker container. This allows to make new developments with the latest version of all core
packages.

### Prerequisites

*   Install docker
*   Clone the repo `git clone git@github.com:myrmx/myrmex.git && cd myrmex`
*   Install the Lerna command line globally:  `npm install -g lerna`
*   Install dependencies in all packages `lerna run npm install`
*   Go to the folder of the development environment/project `cd demo/dev-env`
*   Create a configuration file and set the AWS credentials that Myrmex will use to deploy in AWS `cp env.list.example
    env.list`

#### Launching the development environment

The `run.sh` script runs zsh in a docker container.

```bash
# In the directory `/demo/dev-env`
bash ./run.sh
```

You will be logged with the user `myrmex`, in the root directory of a sample project. This sample project is empty, but it is
configured to use the core packages of Myrmex. Test that the project is correctly configured with the following command.

```bash
# Inside the node container
myrmex -h
```

The code of the repository is available in the container via docker volumes, so any change will be automatically visible in
the container. `run.sh` detects you UID/GID on the host machine and pass it to the container that will change the UID/GID of
the user `myrmex` of the container accordingly. So the permissions in the container will match the permissions on the host.

### Before creating a pull request

From the root folder of the git repository, run the unit tests and check the code style.

```bash
npm test
npm run lint
```
