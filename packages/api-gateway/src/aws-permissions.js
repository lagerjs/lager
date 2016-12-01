'use strict';

module.exports = {
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
};
