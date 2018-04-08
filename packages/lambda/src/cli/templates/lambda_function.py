import json

def lambda_handler(event, context):
    print("Received event: " + json.dumps(event, indent=2))
    return {
        'statusCode': 200,
        'headers': {},
        'body': json.dumps({
            "msg": "This Lambda is not implemented yet",
            "event": event
        }),
    }
