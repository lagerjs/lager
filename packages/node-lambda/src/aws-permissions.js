'use strict';

module.exports = {
  policy: {
    Version: '2012-10-17',
    Statement: [{
      Effect: 'Allow',
      Action: [
        'lambda:CreateAlias',
        'lambda:DeleteAlias',
        'lambda:DeleteFunction',
        'lambda:GetAlias',
        'lambda:GetFunction',
        'lambda:PublishVersion',
        'lambda:UpdateAlias',
        'lambda:UpdateFunctionCode',
        'lambda:UpdateFunctionConfiguration'
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
};
