/* eslint-env mocha */
/* eslint max-lines: "off" */
'use strict';

const path = require('path');
const assert = require('assert');
const Promise = require('bluebird');
const fs = require('fs-extra');
const exec = Promise.promisify(require('child_process').exec, { multiArgs: true });
const icli = require('../../packages/cli/src/bin/myrmex');
const showStdout = !!process.env.MYRMEX_SHOW_STDOUT;

function cleanup() {
  return Promise.all([
    fs.remove(path.join(__dirname, 'lambda')),
    fs.remove(path.join(__dirname, 'myrmex.log'))
  ]);
}

describe('use of the plugin @myrmex/lambda', () => {

  before(() => {
    process.chdir(__dirname);
    return cleanup();
  });

  beforeEach(() => {
    return icli.init();
  });

  after(() => {
    return cleanup();
  });

  describe('creation of a node module', () => {
    it('should be done via the sub-command "create-node-module"', () => {
      icli.catchPrintStart(showStdout);
      return icli.parse(['node', 'script.js', 'create-node-module', 'test-module', '--dependencies', ''])
      .then(res => {
        icli.catchPrintStop();
        // Create the main file of the module
        const src = path.join(__dirname, 'assets', 'modules', 'test-module.js');
        const dest = path.join(__dirname, 'lambda', 'modules', 'test-module', 'index.js');
        return fs.copy(src, dest);
      })
      .then(() => {
        icli.init();
        return icli.myrmex.getPlugin('lambda').loadModules();
      })
      .then(modules => {
        assert.equal(modules.length, 1);
        assert.equal(modules[0].getName(), 'test-module');
        assert.equal(modules[0].getFsPath().substr(-26), 'lambda/modules/test-module');
        assert.equal(modules[0].getPackageJson().name, 'test-module');
        assert.equal(modules[0].getPackageJson().version, '0.0.0');
        const m = require(modules[0].getFsPath());
        assert.equal(m.key, 'test module value');
      });
    });
  });

  describe('creation of a second module', () => {
    it('should be done via the sub-command "create-node-module"', () => {
      icli.catchPrintStart(showStdout);
      return icli.parse(['node', 'script.js', 'create-node-module', 'test-module2', '--dependencies', 'test-module'])
      .then(res => {
        icli.catchPrintStop();
        // Create the main file of the module
        const src = path.join(__dirname, 'assets', 'modules', 'test-module2.js');
        const dest = path.join(__dirname, 'lambda', 'modules', 'test-module2', 'index.js');
        return fs.copy(src, dest);
      })
      .then(() => {
        return exec('npm install --loglevel=error', { cwd: path.join(__dirname, 'lambda', 'modules', 'test-module2') });
      })
      .then(() => {
        icli.init();
        return icli.myrmex.getPlugin('lambda').loadModules();
      })
      .then(modules => {
        assert.equal(modules.length, 2);
        assert.equal(modules[1].getName(), 'test-module2');
        assert.equal(modules[1].getFsPath().substr(-27), 'lambda/modules/test-module2');
        assert.equal(modules[1].getPackageJson().name, 'test-module2');
        assert.equal(modules[1].getPackageJson().version, '0.0.0');
        const m = require(modules[1].getFsPath());
        assert.equal(m.keyTestModule, 'test module value');
        assert.equal(m.keyTestModule2, 'test module2 value');
      });
    });
  });

  describe('creation of node Lambdas', () => {
    it('should be done via the sub-command "create-lambda"', () => {
      icli.catchPrintStart(showStdout);
      return icli.parse([
        'node', 'script.js', 'create-lambda', 'node-a',
        '-r', 'nodejs8.10',
        '-t', '12',
        '-m', '128',
        '--dependencies',
        'test-module',
        '--role',
        'arn:aws:iam::' + process.env.AWS_ACCOUNT_ID + ':role/LambdaBasicExecution'
      ])
      .then(res => {
        return icli.parse([
          'node', 'script.js', 'create-lambda', 'node-b',
          '-r', 'nodejs4.3',
          '-t', '5',
          '-m', '256',
          '--dependencies',
          '',
          '--role',
          'arn:aws:iam::' + process.env.AWS_ACCOUNT_ID + ':role/LambdaBasicExecution'
        ]);
      })
      .then(res => {
        icli.catchPrintStop();
        const nodeA = {
          src: path.join(__dirname, 'assets', 'lambdas/node-a.js'),
          dst: path.join(__dirname, 'lambda', 'lambdas', 'node-a', 'index.js')
        };
        const nodeB = {
          src: path.join(__dirname, 'assets', 'lambdas/node-b.js'),
          dst: path.join(__dirname, 'lambda', 'lambdas', 'node-b', 'index.js')
        };
        return Promise.all([
          fs.copy(nodeA.src, nodeA.dst),
          fs.copy(nodeB.src, nodeB.dst)
        ]);
      })
      .then(() => {
        icli.init();
        return icli.myrmex.getPlugin('lambda').loadLambdas();
      })
      .then(lambdas => {
        assert.equal(lambdas.length, 2);
        assert.equal(lambdas[0].getIdentifier(), 'node-a');
        assert.equal(lambdas[0].getFsPath().substr(-21), 'lambda/lambdas/node-a');
        assert.equal(lambdas[0].getPackageJson().name, 'node-a');
        assert.equal(lambdas[0].getPackageJson().version, '0.0.0');
        assert.equal(lambdas[1].getIdentifier(), 'node-b');
        assert.equal(lambdas[1].getFsPath().substr(-21), 'lambda/lambdas/node-b');
        assert.equal(lambdas[1].getPackageJson().name, 'node-b');
        assert.equal(lambdas[1].getPackageJson().version, '0.0.0');
      });
    });
  });

  describe('creation of python Lambdas', () => {
    it('should be done via the sub-command "create-lambda"', () => {
      icli.catchPrintStart(showStdout);
      return icli.parse([
        'node', 'script.js', 'create-lambda', 'python-a',
        '-r', 'python2.7',
        '-t', '12',
        '-m', '128',
        '--role',
        'arn:aws:iam::' + process.env.AWS_ACCOUNT_ID + ':role/LambdaBasicExecution'
      ])
      .then(res => {
        return icli.parse([
          'node', 'script.js', 'create-lambda', 'python-b',
          '-r', 'python2.7',
          '-t', '5',
          '-m', '256',
          '--role',
          'arn:aws:iam::' + process.env.AWS_ACCOUNT_ID + ':role/LambdaBasicExecution'
        ]);
      })
      .then(res => {
        icli.catchPrintStop();
        const requirements = {
          src: path.join(__dirname, 'assets', 'lambdas', 'requirements.txt'),
          dst: path.join(__dirname, 'lambda', 'lambdas', 'python-a', 'requirements.txt')
        };
        const pythonA = {
          src: path.join(__dirname, 'assets', 'lambdas', 'lambda_function.py'),
          dst: path.join(__dirname, 'lambda', 'lambdas', 'python-a', 'lambda_function.py')
        };
        const pythonB = {
          src: path.join(__dirname, 'assets', 'lambdas', 'lambda_function.py'),
          dst: path.join(__dirname, 'lambda', 'lambdas', 'python-b', 'lambda_function.py')
        };
        return Promise.all([
          fs.copy(requirements.src, requirements.dst),
          fs.copy(pythonA.src, pythonA.dst),
          fs.copy(pythonB.src, pythonB.dst)
        ]);
      })
      .then(() => {
        icli.init();
        return icli.myrmex.getPlugin('lambda').loadLambdas();
      })
      .then(lambdas => {
        assert.equal(lambdas.length, 4);
        assert.equal(lambdas[2].getIdentifier(), 'python-a');
        assert.equal(lambdas[2].getFsPath().substr(-23), 'lambda/lambdas/python-a');
        assert.equal(lambdas[3].getIdentifier(), 'python-b');
        assert.equal(lambdas[3].getFsPath().substr(-23), 'lambda/lambdas/python-b');
        lambdas[2].getPackageJson();
        throw new Error('This code should not be reached');
      })
      .catch(e => {
        assert.equal(
          e.message,
          'Tried to load a package.json file on a python2.7 Lambda (python-a)'
        );
      });
    });
  });

  describe('local installation of Lambdas', () => {
    it('should be done via the sub-command "install-lambdas-locally"', function() {
      this.timeout(20000);
      icli.catchPrintStart(showStdout);
      return icli.parse(['node', 'script.js', 'install-lambdas-locally', 'node-a', 'node-b', 'python-a', 'python-b'])
      .then(res => {
        icli.catchPrintStop();
        return Promise.all([
          fs.pathExists(path.join(__dirname, 'lambda', 'lambdas', 'node-a', 'node_modules')),
          fs.pathExists(path.join(__dirname, 'lambda', 'lambdas', 'python-a', 'bcrypt')),
        ]);
      })
      .spread((node_module_exists, bcrypt_exists) => {
        assert.ok(node_module_exists);
        assert.ok(bcrypt_exists);
      });
    });
  });

  describe('local execution of Lambdas', () => {
    it('should be done via the sub-command "test-lambda-locally"', () => {
      const src = path.join(__dirname, 'assets', 'lambdas', 'events');
      return Promise.all([
        fs.copy(src, path.join(__dirname, 'lambda', 'lambdas', 'node-a', 'events')),
        fs.copy(src, path.join(__dirname, 'lambda', 'lambdas', 'node-b', 'events')),
        fs.copy(src, path.join(__dirname, 'lambda', 'lambdas', 'python-a', 'events')),
        fs.copy(src, path.join(__dirname, 'lambda', 'lambdas', 'python-b', 'events'))
      ])
      .then(() => {
        icli.catchPrintStart(showStdout);
        return icli.parse(['node', 'script.js', 'test-lambda-locally', 'node-a', '--event', 'test-success']);
      })
      .then(result => {
        const stdout = icli.catchPrintStop();
        assert.ok(stdout.indexOf('Executing \x1b[36mnode-a\x1b[0m') > -1);
        assert.ok(stdout.indexOf('\x1b[32mSuccess:\x1b[0m') > -1);
        assert.ok(stdout.indexOf('cryptographed password') > -1);
        icli.catchPrintStart(showStdout);
        return icli.parse(['node', 'script.js', 'test-lambda-locally', 'node-b', '--event', 'test-success']);
      })
      .then(result => {
        const stdout = icli.catchPrintStop();
        assert.ok(stdout.indexOf('Executing \x1b[36mnode-b\x1b[0m') > -1);
        assert.ok(stdout.indexOf('\x1b[32mSuccess:\x1b[0m') > -1);
        assert.ok(stdout.indexOf('cryptographed password') > -1);
        icli.catchPrintStart(showStdout);
        return icli.parse(['node', 'script.js', 'test-lambda-locally', 'python-a', '--event', 'test-success']);
      })
      .then(result => {
        const stdout = icli.catchPrintStop();
        assert.ok(stdout.indexOf('Executing \x1b[36mpython-a\x1b[0m') > -1);
        assert.ok(stdout.indexOf('\x1b[32mResponse:\x1b[0m') > -1);
        assert.ok(stdout.indexOf('cryptographed password') > -1);
        icli.catchPrintStart(showStdout);
        return icli.parse(['node', 'script.js', 'test-lambda-locally', 'python-b', '--event', 'test-success']);
      })
      .then(result => {
        const stdout = icli.catchPrintStop();
        assert.ok(stdout.indexOf('Executing \x1b[36mpython-b\x1b[0m') > -1);
        assert.ok(stdout.indexOf('\x1b[32mResponse:\x1b[0m') > -1);
        assert.ok(stdout.indexOf('cryptographed password') > -1);
      });
    });

    it('should report handled errors', () => {
      icli.catchPrintStart(showStdout);
      return icli.parse(['node', 'script.js', 'test-lambda-locally', 'node-a', '--event', 'test-failure'])
      .then(result => {
        const stdout = icli.catchPrintStop();
        assert.ok(stdout.indexOf('Executing \x1b[36mnode-a\x1b[0m') > -1);
        assert.ok(stdout.indexOf('\x1b[31mHandled error:\x1b[0m') > -1);
        assert.ok(stdout.indexOf('Error: Password must be 6 character long minimum') > -1);
        icli.catchPrintStart(showStdout);
        return icli.parse(['node', 'script.js', 'test-lambda-locally', 'node-b', '--event', 'test-failure']);
      })
      .then(result => {
        const stdout = icli.catchPrintStop();
        assert.ok(stdout.indexOf('Executing \x1b[36mnode-b\x1b[0m') > -1);
        assert.ok(stdout.indexOf('\x1b[31mHandled error:\x1b[0m') > -1);
        assert.ok(stdout.indexOf('Error: Password must be 6 character long minimum') > -1);
        icli.catchPrintStart(showStdout);
        return icli.parse(['node', 'script.js', 'test-lambda-locally', 'python-a', '--event', 'test-failure']);
      })
      .then(result => {
        const stdout = icli.catchPrintStop();
        assert.ok(stdout.indexOf('Executing \x1b[36mpython-a\x1b[0m') > -1);
        assert.ok(stdout.indexOf('\x1b[32mResponse:\x1b[0m') > -1);
        assert.ok(stdout.indexOf('Password must be 6 character long minimum') > -1);
        icli.catchPrintStart(showStdout);
        return icli.parse(['node', 'script.js', 'test-lambda-locally', 'python-b', '--event', 'test-failure']);
      })
      .then(result => {
        const stdout = icli.catchPrintStop();
        assert.ok(stdout.indexOf('Executing \x1b[36mpython-b\x1b[0m') > -1);
        assert.ok(stdout.indexOf('\x1b[32mResponse:\x1b[0m') > -1);
        assert.ok(stdout.indexOf('Password must be 6 character long minimum') > -1);
      });
    });

    it('should report execution errors', () => {
      icli.catchPrintStart(showStdout);
      return icli.parse(['node', 'script.js', 'test-lambda-locally', 'node-a', '--event', 'test-error'])
      .then(result => {
        const stdout = icli.catchPrintStop();
        assert.ok(stdout.indexOf('Executing \x1b[36mnode-a\x1b[0m') > -1);
        assert.ok(stdout.indexOf('\x1b[31mAn error occurred during the execution:\x1b[0m') > -1);
        assert.ok(stdout.indexOf('TypeError: Cannot read property \'length\' of undefined') > -1);
        icli.catchPrintStart(showStdout);
        return icli.parse(['node', 'script.js', 'test-lambda-locally', 'node-b', '--event', 'test-error']);
      })
      .then(result => {
        const stdout = icli.catchPrintStop();
        assert.ok(stdout.indexOf('Executing \x1b[36mnode-b\x1b[0m') > -1);
        assert.ok(stdout.indexOf('\x1b[31mAn error occurred during the execution:\x1b[0m') > -1);
        assert.ok(stdout.indexOf('TypeError: Cannot read property \'length\' of undefined') > -1);
        icli.catchPrintStart(showStdout);
        return icli.parse(['node', 'script.js', 'test-lambda-locally', 'python-a', '--event', 'test-error']);
      })
      .then(result => {
        const stdout = icli.catchPrintStop();
        assert.ok(stdout.indexOf('Executing \x1b[36mpython-a\x1b[0m') > -1);
        assert.ok(stdout.indexOf('\x1b[31mAn error occurred during the execution:\x1b[0m') > -1);
        assert.ok(stdout.indexOf('Error: Command failed: python -c') > -1);
        icli.catchPrintStart(showStdout);
        return icli.parse(['node', 'script.js', 'test-lambda-locally', 'python-b', '--event', 'test-error']);
      })
      .then(result => {
        const stdout = icli.catchPrintStop();
        assert.ok(stdout.indexOf('Executing \x1b[36mpython-b\x1b[0m') > -1);
        assert.ok(stdout.indexOf('\x1b[31mAn error occurred during the execution:\x1b[0m') > -1);
        assert.ok(stdout.indexOf('Error: Command failed: python -c') > -1);
      });
    });
  });

  describe('Deployment of Lambdas', () => {
    it('should be done via the sub-command "deploy-lambdas"', function() {
      icli.catchPrintStart(showStdout);
      this.timeout(30000);
      return icli.parse(['node', 'script.js', 'deploy-lambdas', 'node-a', 'node-b', 'python-a', 'python-b', '-r', 'us-east-1', '-e', 'TEST', '-a', 'blue'])
      .then(res => {
        const stdout = icli.catchPrintStop();
        assert.ok(stdout.indexOf('Deploying \x1b[36m4\x1b[0m Lambda(s):') > -1);
        assert.ok(stdout.indexOf('AWS region: \x1b[36mus-east-1\x1b[0m') > -1);
        assert.ok(stdout.indexOf('Environement (prefix for Lambdas names): \x1b[36mTEST\x1b[0m') > -1);
        assert.ok(stdout.indexOf('Alias: \x1b[36mblue\x1b[0m') > -1);
        assert.ok(stdout.indexOf('TEST-node-a') > -1);
        assert.ok(stdout.indexOf('arn:aws:lambda:us-east-1:' + process.env.AWS_ACCOUNT_ID + ':function:TEST-node-a:blue') > -1);
      });
    });

    it('should be done without needing to list all lambdas, set an environment or an alias', function() {
      icli.catchPrintStart(showStdout);
      this.timeout(30000);
      return icli.parse(['node', 'script.js', 'deploy-lambdas', '--all', '-r', 'us-east-1', '-e', '', '-a', ''])
      .then(res => {
        const stdout = icli.catchPrintStop();
        assert.ok(stdout.indexOf('Deploying \x1b[36m4\x1b[0m Lambda(s):') > -1);
        assert.ok(stdout.indexOf('AWS region: \x1b[36mus-east-1\x1b[0m') > -1);
        assert.ok(stdout.indexOf('Environement (prefix for Lambdas names): \x1b[36mno environment prefix\x1b[0m') > -1);
        assert.ok(stdout.indexOf('Alias: \x1b[36mno alias\x1b[0m') > -1);
        assert.ok(stdout.indexOf('node-a') > -1);
        assert.ok(stdout.indexOf('arn:aws:lambda:us-east-1:' + process.env.AWS_ACCOUNT_ID + ':function:node-a') > -1);
      });
    });
  });

  describe('Execution of Lambdas in AWS', () => {
    it('should be done via the sub-command "test-lambda"', () => {
      icli.catchPrintStart(showStdout);
      return icli.parse(['node', 'script.js', 'test-lambda', 'node-a', '--event', 'test-success', '-r', 'us-east-1', '-e', 'TEST', '-a', 'blue'])
      .then(result => {
        const stdout = icli.catchPrintStop();
        assert.ok(stdout.indexOf('Executing \x1b[36mnode-a\x1b[0m') > -1);
        assert.ok(stdout.indexOf('\x1b[32mSuccess:\x1b[0m') > -1);
        assert.ok(stdout.indexOf('"StatusCode": 200') > -1);
        assert.ok(stdout.indexOf('"Payload": "cryptographed password"') > -1);
        icli.catchPrintStart(showStdout);
        return icli.parse(['node', 'script.js', 'test-lambda', 'node-b', '--event', 'test-success', '-r', 'us-east-1', '-e', '', '-a', '']);
      })
      .then(result => {
        const stdout = icli.catchPrintStop();
        assert.ok(stdout.indexOf('Executing \x1b[36mnode-b\x1b[0m') > -1);
        assert.ok(stdout.indexOf('\x1b[32mSuccess:\x1b[0m') > -1);
        assert.ok(stdout.indexOf('"StatusCode": 200') > -1);
        assert.ok(stdout.indexOf('"Payload": "cryptographed password"') > -1);
        icli.catchPrintStart(showStdout);
        return icli.parse(['node', 'script.js', 'test-lambda', 'python-a', '--event', 'test-success', '-r', 'us-east-1', '-e', 'TEST', '-a', 'blue']);
      })
      .then(result => {
        const stdout = icli.catchPrintStop();
        assert.ok(stdout.indexOf('Executing \x1b[36mpython-a\x1b[0m') > -1);
        assert.ok(stdout.indexOf('\x1b[32mSuccess:\x1b[0m') > -1);
        assert.ok(stdout.indexOf('"StatusCode": 200') > -1);
        assert.ok(stdout.indexOf('"Payload": "cryptographed password"') > -1);
        icli.catchPrintStart(showStdout);
        return icli.parse(['node', 'script.js', 'test-lambda', 'python-b', '--event', 'test-success', '-r', 'us-east-1', '-e', 'TEST', '-a', 'blue']);
      })
      .then(result => {
        const stdout = icli.catchPrintStop();
        assert.ok(stdout.indexOf('Executing \x1b[36mpython-b\x1b[0m') > -1);
        assert.ok(stdout.indexOf('\x1b[32mSuccess:\x1b[0m') > -1);
        assert.ok(stdout.indexOf('"StatusCode": 200') > -1);
        assert.ok(stdout.indexOf('"Payload": "cryptographed password"') > -1);
      });
    });

    it('should report handled errors"', () => {
      icli.catchPrintStart(showStdout);
      return icli.parse(['node', 'script.js', 'test-lambda', 'node-a', '--event', 'test-failure', '-r', 'us-east-1', '-e', 'TEST', '-a', 'blue'])
      .then(result => {
        const stdout = icli.catchPrintStop();
        assert.ok(stdout.indexOf('Executing \x1b[36mnode-a\x1b[0m') > -1);
        assert.ok(stdout.indexOf('\x1b[31mHandled error:\x1b[0m') > -1);
        assert.ok(stdout.indexOf('"StatusCode": 200') > -1);
        assert.ok(stdout.indexOf('"errorMessage": "Password must be 6 character long minimum"') > -1);
        icli.catchPrintStart(showStdout);
        return icli.parse(['node', 'script.js', 'test-lambda', 'node-b', '--event', 'test-failure', '-r', 'us-east-1', '-e', 'TEST', '-a', 'blue']);
      })
      .then(result => {
        const stdout = icli.catchPrintStop();
        assert.ok(stdout.indexOf('Executing \x1b[36mnode-b\x1b[0m') > -1);
        assert.ok(stdout.indexOf('\x1b[31mHandled error:\x1b[0m') > -1);
        assert.ok(stdout.indexOf('"StatusCode": 200') > -1);
        assert.ok(stdout.indexOf('"errorMessage": "Password must be 6 character long minimum"') > -1);
        icli.catchPrintStart(showStdout);
        return icli.parse(['node', 'script.js', 'test-lambda', 'python-a', '--event', 'test-failure', '-r', 'us-east-1', '-e', '', '-a', '']);
      })
      .then(result => {
        const stdout = icli.catchPrintStop();
        assert.ok(stdout.indexOf('Executing \x1b[36mpython-a\x1b[0m') > -1);
        assert.ok(stdout.indexOf('\x1b[32mSuccess:\x1b[0m') > -1);
        assert.ok(stdout.indexOf('"StatusCode": 200') > -1);
        assert.ok(stdout.indexOf('"Payload": "Password must be 6 character long minimum"') > -1);
        icli.catchPrintStart(showStdout);
        return icli.parse(['node', 'script.js', 'test-lambda', 'python-b', '--event', 'test-failure', '-r', 'us-east-1', '-e', 'TEST', '-a', 'blue']);
      })
      .then(result => {
        const stdout = icli.catchPrintStop();
        assert.ok(stdout.indexOf('Executing \x1b[36mpython-b\x1b[0m') > -1);
        assert.ok(stdout.indexOf('\x1b[32mSuccess:\x1b[0m') > -1);
        assert.ok(stdout.indexOf('"StatusCode": 200') > -1);
        assert.ok(stdout.indexOf('"Payload": "Password must be 6 character long minimum"') > -1);
      });
    });

    it('should report execution errors"', () => {
      icli.catchPrintStart(showStdout);
      return icli.parse(['node', 'script.js', 'test-lambda', 'node-a', '--event', 'test-error', '-r', 'us-east-1', '-e', 'TEST', '-a', 'blue'])
      .then(result => {
        const stdout = icli.catchPrintStop();
        assert.ok(stdout.indexOf('Executing \x1b[36mnode-a\x1b[0m') > -1);
        assert.ok(stdout.indexOf('\x1b[31mUnhandled error:\x1b[0m') > -1);
        assert.ok(stdout.indexOf('"StatusCode": 200') > -1);
        assert.ok(stdout.indexOf('"errorMessage": "RequestId: ') > -1);
        assert.ok(stdout.indexOf('Process exited before completing request"') > -1);
        icli.catchPrintStart(showStdout);
        return icli.parse(['node', 'script.js', 'test-lambda', 'node-b', '--event', 'test-error', '-r', 'us-east-1', '-e', 'TEST', '-a', 'blue']);
      })
      .then(result => {
        const stdout = icli.catchPrintStop();
        assert.ok(stdout.indexOf('Executing \x1b[36mnode-b\x1b[0m') > -1);
        assert.ok(stdout.indexOf('\x1b[31mUnhandled error:\x1b[0m') > -1);
        assert.ok(stdout.indexOf('"StatusCode": 200') > -1);
        assert.ok(stdout.indexOf('"errorMessage": "RequestId: ') > -1);
        assert.ok(stdout.indexOf('Process exited before completing request"') > -1);
        icli.catchPrintStart(showStdout);
        return icli.parse(['node', 'script.js', 'test-lambda', 'python-a', '--event', 'test-error', '-r', 'us-east-1', '-e', 'TEST', '-a', 'blue']);
      })
      .then(result => {
        const stdout = icli.catchPrintStop();
        assert.ok(stdout.indexOf('Executing \x1b[36mpython-a\x1b[0m') > -1);
        assert.ok(stdout.indexOf('\x1b[31mUnhandled error:\x1b[0m') > -1);
        assert.ok(stdout.indexOf('"StatusCode": 200') > -1);
        assert.ok(stdout.indexOf('"errorMessage": "\'password\'"') > -1);
        assert.ok(stdout.indexOf('"errorType": "KeyError"') > -1);
        icli.catchPrintStart(showStdout);
        return icli.parse(['node', 'script.js', 'test-lambda', 'python-b', '--event', 'test-error', '-r', 'us-east-1', '-e', 'TEST', '-a', 'blue']);
      })
      .then(result => {
        const stdout = icli.catchPrintStop();
        assert.ok(stdout.indexOf('Executing \x1b[36mpython-b\x1b[0m') > -1);
        assert.ok(stdout.indexOf('\x1b[31mUnhandled error:\x1b[0m') > -1);
        assert.ok(stdout.indexOf('"StatusCode": 200') > -1);
        assert.ok(stdout.indexOf('"errorMessage": "\'password\'"') > -1);
        assert.ok(stdout.indexOf('"errorType": "KeyError"') > -1);
      });
    });

  });

});
