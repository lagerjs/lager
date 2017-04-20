---
title: Command line of the @lager/iam plugin
keywords: lager, iam, command-line
tags: [iam, command-line]
summary: "The @lager/iam plugin add some sub-commands to the Lager CLI"
sidebar: iam_sidebar
permalink: iam-commands.html
folder: iam
---

## create-policy

Usage:

```
create-policy [identifier]
```

Create a new policy in `iam/policies/<identifier>.json`. The command does not configure the policy for you but just prepare the file in the right place.  

## create-role

Usage:

```
create-role [options] [identifier]

  Options:
    -m, --model <model-identifier>       select a model to quickly create the role configuration
    -p, --policies <policy-identifiers>  select the policies to attach to the role
```

Create a new role in `iam/roles/<identifier>.json`.

Two predefined role configuration are available:

 *   `APIGatewayLambdaInvocation`: The `AWSLambdaRole` policy is attached to it and it can be associated to API Gateway endpoints.
 *   `LambdaBasicExecutionRole`: The `AWSLambdaBasicExecutionRole` is attached to it and it can be associated to Lambda functions.

You can define you own policies and "trust-relationship" configuration. Is is also possible to reference policies from the Lager project.

Roles can be referenced by other plugins to facilitate the deployment of Lager applications: by defining roles in the Lager project, deploying some resources
like Lambda function or API definitions can be done very quickly on any new environment.

Of course, you are always free to not use this facility.

## deploy-policies

Usage:

```
deploy-policies [options] [policy-identifiers]

  Options:
    -e, --environment [environment]  An environment identifier that will be used as a prefix
    -s, --stage [stage]              A stage identifier that will be used as a suffix
```

Deploy one or more policies in AWS. The `environment` option is used as a prefix and the `stage` option as a suffix.

## deploy-roles

Usage:

```
deploy-roles [options] [role-identifiers]

  Options:
    -e, --environment [environment]  An environment identifier that will be used as a prefix
    -s, --stage [stage]              A stage identifier that will be used as a suffix
```

Deploy one or more roles in AWS. The `environment` option is used as a prefix and the `stage` option as a suffix.
