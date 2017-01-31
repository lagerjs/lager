'use strict';

module.exports = [
  {
    identifier: 'deploy-node-lambdas',
    description: 'Policy that allows to use the command "deploy-node-lambdas"',
    policy: {
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Action: [
          'lambda:InvokeFunction',
        ],
        Resource: [
          'arn:aws:lambda:us-east-1:012345678912:*'
        ]
      }, {
        Effect: 'Allow',
        Action: [
          'lambda:CreateFunction'
        ],
        Resource: [
          '*'
        ]
      }, {
        Effect: 'Allow',
        Action: [
          'iam:PassRole'
        ],
        Resource: [
          'arn:aws:iam::012345678912:role/*'
        ]
      }]
    }
  }, {
    identifier: 'test-node-lambda',
    description: 'Policy that allows to use the command "test-node-lambda"',
    policy: {
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Action: [
          'lambda:InvokeFunction',
        ],
        Resource: [
          'arn:aws:lambda:us-east-1:012345678912:*'
        ]
      }]
    }
  }
];
