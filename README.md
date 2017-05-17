<img align="right" alt="lager logo" src="https://raw.githubusercontent.com/lagerjs/lager/master/img/lager-logo2.png" />

# Lager (beta)

[![Build Status](https://travis-ci.org/lagerjs/lager.svg)](https://travis-ci.org/lagerjs/lager)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/249a9410043a43dca599d29f53a7bf98)](https://www.codacy.com/app/alexisno/lager?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=lagerjs/lager&amp;utm_campaign=Badge_Grade)
[![Codecov](https://codecov.io/gh/lagerjs/lager/branch/master/graph/badge.svg)](https://codecov.io/gh/lagerjs/lager)
[![Known Vulnerabilities](https://snyk.io/test/github/lagerjs/lager/badge.svg?targetFile=packages%2Flager%2Fpackage.json)](https://snyk.io/test/github/lagerjs/lager?targetFile=packages%2Flager%2Fpackage.json)

---

## What is it?

The **Lambda API Gateway Endpoints Router**

> AWS Lambda + API Gateway + Swagger specification === *Lager*

Lager helps you to organize your code and deploy serverless applications in AWS. Its plugin system allows you to work with
AWS Lambda or API Gateway or both of them. The IAM plugin can help you to declare the IAM permissions your application needs
in your versionning system.

Control the IAM permissions needed to deploy your application. Allow several developers to publish different versions of the
project on the same AWS account. 

Write your own plugins to enrich the command line, create higher level functionalities and integrate with other services.
Then share it as npm modules!

```
$ npm install -g @lager/cli
$ lager new my-serverless-project
$ cd my-serverless-project
$ lager -h
```

Documentation available at [https://lagerjs.github.io](https://lagerjs.github.io).

---

## Code coverage

![Codecov graph](https://codecov.io/gh/lagerjs/lager/branch/master/graphs/icicle.svg "Code coverage")

---

## Dependencies vulnerabilities

| NPM package        | Analysis                                                                                                                       |
| ------------------:| ------------------------------------------------------------------------------------------------------------------------------ |
|       @lager/lager | [![Known Vulnerabilities](https://snyk.io/test/npm/@lager/lager/badge.svg)](https://snyk.io/test/npm/@lager/lager)             |
|         @lager/cli | [![Known Vulnerabilities](https://snyk.io/test/npm/@lager/cli/badge.svg)](https://snyk.io/test/npm/@lager/cli)                 |
|         @lager/iam | [![Known Vulnerabilities](https://snyk.io/test/npm/@lager/iam/badge.svg)](https://snyk.io/test/npm/@lager/iam)                 |
| @lager/lambda | [![Known Vulnerabilities](https://snyk.io/test/npm/@lager/lambda/badge.svg)](https://snyk.io/test/npm/@lager/lambda) |
| @lager/api-gateway | [![Known Vulnerabilities](https://snyk.io/test/npm/@lager/api-gateway/badge.svg)](https://snyk.io/test/npm/@lager/api-gateway) |

---

[MIT](LICENSE)
