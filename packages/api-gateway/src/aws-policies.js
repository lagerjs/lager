'use strict';

module.exports = [
  {
    identifier: 'deploy-api-gateway',
    description: 'Policy that allows to use the command "deploy-apis"',
    policy: {
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Action: [
          'apigateway:GET',
          'apigateway:POST',
          'apigateway:PUT',
          'apigateway:PATCH',
          'apigateway:DELETE'
        ],
        Resource: [
          '*'
        ]
      }]
    }
  }
];
