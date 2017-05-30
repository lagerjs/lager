/*eslint-env mocha */
'use strict';

const path = require('path');
const assert = require('assert');
const Promise = require('bluebird');
const rp = require('request-promise');
const fs = require('fs-extra');
const remove = Promise.promisify(fs.remove);
const icli = require('../../packages/cli/src/bin/myrmex');
const showStdout = !!process.env.MYRMEX_SHOW_STDOUT;
const apiDeployDelay = require('../api-deploy-delay');

describe('Creation and deployment of the Planet Express project', () => {

  before(() => {
    process.chdir(__dirname);
  });

  beforeEach(() => {
    return icli.init();
  });

  after(() => {
    return Promise.all([
      remove(path.join(__dirname, 'api-gateway')),
      remove(path.join(__dirname, 'lambda')),
      remove(path.join(__dirname, 'iam')),
      remove(path.join(__dirname, 'myrmex.log'))
    ]);
  });

  describe('Creation of an execution role', () => {
    it('should be done via the sub-command "create-role"', () => {
      icli.catchPrintStart(showStdout);
      return icli.parse('node script.js create-role PlanetExpressLambdaExecution -m LambdaBasicExecutionRole'.split(' '))
      .then(res => {
        const stdout = icli.catchPrintStop();
        assert.ok(stdout.indexOf('The IAM role \x1b[36mPlanetExpressLambdaExecution\x1b[0m has been created') > -1);
      });
    });
  });

  describe('Creation of a node module', () => {
    it('should be done via the sub-command "create-node-module"', () => {
      icli.catchPrintStart(showStdout);
      return icli.parse('node script.js create-node-module log'.split(' '))
      .then(res => {
        const stdout = icli.catchPrintStop();
        assert.ok(stdout.indexOf('The node module \x1b[36mlog\x1b[0m has been created') > -1);
        assert.ok(stdout.indexOf('To import it in an existing Lambda, edit the file') > -1);
        assert.ok(stdout.indexOf('and add \x1b[36m"log": "../modules/log"\x1b[0m in the section \x1b[36mdependencies\x1b[0m') > -1);
      });
    });
  });

  describe('Creation of a node module with a dependency', () => {
    it('should be done via the sub-command "create-node-module"', () => {
      icli.catchPrintStart(showStdout);
      return icli.parse('node script.js create-node-module data-access --dependencies log'.split(' '))
      .then(res => {
        const stdout = icli.catchPrintStop();
        assert.ok(stdout.indexOf('The node module \x1b[36mdata-access\x1b[0m has been created') > -1);
        assert.ok(stdout.indexOf('To import it in an existing Lambda, edit the file') > -1);
        assert.ok(stdout.indexOf('and add \x1b[36m"data-access": "../modules/data-access"\x1b[0m in the section \x1b[36mdependencies\x1b[0m') > -1);
        assert.ok(true);
      });
    });
  });

  describe('Creation of a node Lambda', () => {
    it('should be done via the sub-command "create-lambda"', () => {
      icli.catchPrintStart(showStdout);
      return icli.parse('node script.js create-lambda api-generic -r nodejs6.10 -t 20 -m 256 --role PlanetExpressLambdaExecution --dependencies log'.split(' '))
      .then(res => {
        const stdout = icli.catchPrintStop();
        assert.ok(stdout.indexOf('The Lambda \x1b[36mapi-generic\x1b[0m has been created') > -1);
        assert.ok(stdout.indexOf('Its configuration and its handler function are available in') > -1);
      });
    });
  });

  describe('Creation of an invocation role', () => {
    it('should be done via the sub-command "create-role"', () => {
      icli.catchPrintStart(showStdout);
      return icli.parse('node script.js create-role PlanetExpressLambdaInvocation -m APIGatewayLambdaInvocation'.split(' '))
      .then(res => {
        const stdout = icli.catchPrintStop();
        assert.ok(stdout.indexOf('The IAM role \x1b[36mPlanetExpressLambdaInvocation\x1b[0m has been created') > -1);
      });
    });
  });

  describe('Creation of APIs', () => {
    it('should be done via the sub-command "create-api"', () => {
      icli.catchPrintStart(showStdout);
      return icli.parse('node script.js create-api back-office -t Back+Office -d Planet+Express+API+for+Back+Office'.split(' '))
      .then(res => {
        return icli.parse('node script.js create-api sender -t Sender -d Planet+Express+API+for+sender+application'.split(' '));
      })
      .then(res => {
        return icli.parse('node script.js create-api recipient -t Recipient -d Planet+Express+API+for+recipient+application'.split(' '));
      })
      .then(res => {
        const stdout = icli.catchPrintStop();
        assert.ok(stdout.indexOf('The API "\x1b[36mback-office\x1b[0m" has been created') > -1);
        assert.ok(stdout.indexOf('The API "\x1b[36msender\x1b[0m" has been created') > -1);
        assert.ok(stdout.indexOf('The API "\x1b[36mrecipient\x1b[0m" has been created') > -1);
        assert.ok(stdout.indexOf('You can inspect it using the command \x1b[33mmyrmex inspect-api back-office\x1b[0m') > -1);
        assert.ok(stdout.indexOf('You can inspect it using the command \x1b[33mmyrmex inspect-api sender\x1b[0m') > -1);
        assert.ok(stdout.indexOf('You can inspect it using the command \x1b[33mmyrmex inspect-api recipient\x1b[0m') > -1);
      });
    });
  });

  describe('Creation of API endpoints', () => {
    it('should be done via the sub-command "create-endpoint"', () => {
      icli.catchPrintStart(showStdout);
      // eslint-disable-next-line max-len
      return icli.parse('node script.js create-endpoint /delivery/{id} get -a back-office,recipient,sender -s View+a+delivery -i lambda-proxy --auth none --role PlanetExpressLambdaInvocation --lambda api-generic'.split(' '))
      .then(res => {
        // eslint-disable-next-line max-len
        return icli.parse('node script.js create-endpoint /delivery/{id} patch -a back-office -s Update+a+delivery -i lambda-proxy --auth none --role PlanetExpressLambdaInvocation --lambda api-generic'.split(' '));
      })
      .then(res => {
        // eslint-disable-next-line max-len
        return icli.parse('node script.js create-endpoint /delivery post -a back-office,sender -s Create+a+delivery -i lambda-proxy --auth none --role PlanetExpressLambdaInvocation --lambda api-generic'.split(' '));
      })
      .then(res => {
        // eslint-disable-next-line max-len
        return icli.parse('node script.js create-endpoint /delivery/{id} delete -a back-office,recipient -s Delete+a+delivery -i lambda-proxy --auth none --role PlanetExpressLambdaInvocation --lambda api-generic'.split(' '));
      })
      .then(res => {
        const stdout = icli.catchPrintStop();
        assert.ok(stdout.indexOf('The endpoint \x1b[36mGET /delivery/{id}\x1b[0m has been created') > -1);
        assert.ok(stdout.indexOf('You can inspect it using the command \x1b[33mmyrmex inspect-endpoint /delivery/{id} GET\x1b[0m') > -1);
        assert.ok(stdout.indexOf('The endpoint \x1b[36mPATCH /delivery/{id}\x1b[0m has been created') > -1);
        assert.ok(stdout.indexOf('You can inspect it using the command \x1b[33mmyrmex inspect-endpoint /delivery/{id} PATCH\x1b[0m') > -1);
        assert.ok(stdout.indexOf('The endpoint \x1b[36mPOST /delivery\x1b[0m has been created') > -1);
        assert.ok(stdout.indexOf('You can inspect it using the command \x1b[33mmyrmex inspect-endpoint /delivery POST\x1b[0m') > -1);
        assert.ok(stdout.indexOf('The endpoint \x1b[36mDELETE /delivery/{id}\x1b[0m has been created') > -1);
        assert.ok(stdout.indexOf('You can inspect it using the command \x1b[33mmyrmex inspect-endpoint /delivery/{id} DELETE\x1b[0m') > -1);
      });
    });
  });

  describe('Swagger API specification', () => {
    it('should show endpoints associated to an API', () => {
      icli.catchPrintStart(showStdout);
      return icli.parse('node script.js inspect-api sender -s complete -c'.split(' '))
      .then(res => {
        icli.catchPrintStop();
        assert.equal(res.paths['/delivery/{id}'].get.summary, 'View+a+delivery');
        assert.equal(res.paths['/delivery/{id}'].patch, undefined);
        assert.equal(res.paths['/delivery'].post.summary, 'Create+a+delivery');
        assert.equal(res.paths['/delivery/{id}'].delete, undefined);
        assert.equal(res.paths['/delivery/{id}'].get['x-amazon-apigateway-integration'].type, 'aws_proxy');
        assert.equal(res.paths['/delivery/{id}'].get['x-myrmex'].lambda, 'api-generic');
      });
    });
  });

  describe('Swagger API specification for deployment in API Gateway', () => {
    it('should contain API Gateway extensions to Swagger', () => {
      icli.catchPrintStart(showStdout);
      return icli.parse('node script.js inspect-api sender -s api-gateway -c'.split(' '))
      .then(res => {
        icli.catchPrintStop();
        assert.equal(res.paths['/delivery/{id}'].get.summary, 'View+a+delivery');
        assert.equal(res.paths['/delivery/{id}'].get['x-amazon-apigateway-integration'].type, 'aws_proxy');
        assert.equal(res.paths['/delivery/{id}'].get['x-myrmex'], undefined);
      });
    });
  });

  describe('Swagger API specification for documentation purpose', () => {
    it('should not contain API Gateway extensions to Swagger', () => {
      icli.catchPrintStart(showStdout);
      return icli.parse('node script.js inspect-api sender -s doc -c'.split(' '))
      .then(res => {
        icli.catchPrintStop();
        assert.equal(res.paths['/delivery/{id}'].get.summary, 'View+a+delivery');
        assert.equal(res.paths['/delivery/{id}'].get['x-amazon-apigateway-integration'], undefined);
        assert.equal(res.paths['/delivery/{id}'].get['x-myrmex'], undefined);
      });
    });
  });

  describe('Swagger endpoint specification', () => {
    it('should contain the endpoint definition', () => {
      icli.catchPrintStart(showStdout);
      return icli.parse('node script.js inspect-endpoint /delivery/{id} get -s complete -c'.split(' '))
      .then(res => {
        icli.catchPrintStop();
        assert.equal(res.summary, 'View+a+delivery');
        assert.equal(res['x-amazon-apigateway-integration'].type, 'aws_proxy');
        assert.equal(res['x-myrmex'].lambda, 'api-generic');
      });
    });
  });

  describe('Swagger endpoint specification for deployment in API Gateway', () => {
    it('should contain API Gateway extensions to Swagger', () => {
      icli.catchPrintStart(showStdout);
      return icli.parse('node script.js inspect-endpoint /delivery/{id} get -s api-gateway -c'.split(' '))
      .then(res => {
        icli.catchPrintStop();
        assert.equal(res.summary, 'View+a+delivery');
        assert.equal(res['x-amazon-apigateway-integration'].type, 'aws_proxy');
        assert.equal(res['x-myrmex'], undefined);
      });
    });
  });

  describe('Swagger endpoint specification for documentation purpose', () => {
    it('should not contain API Gateway extensions to Swagger', () => {
      icli.catchPrintStart(showStdout);
      return icli.parse('node script.js inspect-endpoint /delivery/{id} get -s doc -c'.split(' '))
      .then(res => {
        icli.catchPrintStop();
        assert.equal(res.summary, 'View+a+delivery');
        assert.equal(res['x-amazon-apigateway-integration'], undefined);
        assert.equal(res['x-myrmex'], undefined);
      });
    });
  });

  describe('Deployment of APIs in AWS', () => {
    it('should be done via the sub-command "deploy-apis"', function() {
      icli.catchPrintStart(showStdout);
      this.timeout(60000);
      let address;
      return apiDeployDelay()
      .then(res => {
        return icli.parse('node script.js deploy-apis back-office -r us-east-1 -s v0 -e DEV --deploy-lambdas all --alias v0'.split(' '));
      })
      .then(res => {
        const stdout = icli.catchPrintStop();
        assert.ok(stdout.indexOf('/delivery/{id}  GET     X') > -1);
        assert.ok(stdout.indexOf('/delivery/{id}  PATCH   X') > -1);
        assert.ok(stdout.indexOf('/delivery       POST    X') > -1);
        assert.ok(stdout.indexOf('/delivery/{id}  DELETE  X') > -1);
        assert.ok(stdout.indexOf('1 Lambda(s) to deploy: api-generic') > -1);
        assert.ok(stdout.indexOf('Lambda functions deployed') > -1);
        assert.ok(stdout.indexOf('DEV-api-generic') > -1);
        assert.ok(stdout.indexOf('Deploying back-office ...') > -1);
        assert.ok(stdout.indexOf('back-office  DEV back-office - Back+Office') > -1);
        assert.ok(stdout.indexOf('APIs have been published') > -1);

        // We call the deployed API and test the response
        address = /https:\/\/.+\.execute-api\.us-east-1\.amazonaws\.com\/v0/.exec(stdout);
        return rp({ uri: address + '/delivery/123', json: true });
      })
      .then(res => {
        assert.equal(res.event.resource, '/delivery/{id}');
        assert.equal(res.event.path, '/delivery/123');
        assert.equal(res.event.httpMethod, 'GET');
        assert.equal(res.event.pathParameters.id, '123');

        // We call the deployed API and test the response
        return rp({ method: 'POST', uri: address + '/delivery', body: { some: 'payload' }, json: true });
      })
      .then(res => {
        assert.equal(res.event.resource, '/delivery');
        assert.equal(res.event.path, '/delivery');
        assert.equal(res.event.httpMethod, 'POST');
        assert.equal(res.event.body, '{"some":"payload"}');
      });
    });
  });

});
