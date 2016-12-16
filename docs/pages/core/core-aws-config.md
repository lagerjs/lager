---
title: Configuration to work with AWS
keywords: lager, core
tags: [getting_started, configuration]
summary: "Lager has been created to define and deploy serverless application in AWS.
The Lager core does not interact with AWS, but as all main plugins do, we will describe here how to configure Lager to communicate with AWS."
sidebar: core_sidebar
permalink: core-aws-config.html
folder: core
---

## Prerequisites

To work with Lager and it's main plugins, you should to have some notions about:

*   AWS IAM
*   AWS Lambda
*   Amazon API Gateway
*   OpenAPI (aka Swagger) specification
*   Node.js

Do not worry, Lager helps you to experiment quickly. But if you really want to be efficient, you will have to know the AWS services that works with Lager.

## Permissions needed to deploy the project in AWS

Lager plugins that manage AWS resources need to have permissions to execute commands that communicate with the AWS API. When a command needs these
permissions, Lager will use the AWS credentials provided by the environment.

~~Each Lager plugin calling the AWS API documents which IAM permissions are needed for each command.~~ *not yet!* Thereby a Lager developer can optimize the
configuration of the IAM policies, users and roles he needs to deploy a project.

## The deployment `context`

When managing content in AWS, Lager main plugins take in consideration the notion of `context`. The `context` contains two properties:

*   An environment name that allows to deploy several environment on one AWS account. For example `DEV`, `QA`, `DEVELOPER_JANE`, `DEVELOPER_JOHN`, etc ...
*   A stage name that allows to deploy several versions of the project in one environment. For example `v1`, `v2`, `latest`, etc ...

The use of the `context` will be explain for each main plugin.
