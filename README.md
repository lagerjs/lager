![Myrmex Logo](https://raw.githubusercontent.com/myrmx/myrmex/master/img/myrmex.png)

[![Build Status](https://travis-ci.org/myrmx/myrmex.svg)](https://travis-ci.org/myrmx/myrmex)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/249a9410043a43dca599d29f53a7bf98)](https://www.codacy.com/app/alexisno/myrmex?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=myrmx/myrmex&amp;utm_campaign=Badge_Grade)
[![Codecov](https://codecov.io/gh/myrmx/myrmex/branch/master/graph/badge.svg)](https://codecov.io/gh/myrmx/myrmex)
[![Known Vulnerabilities](https://snyk.io/test/github/myrmx/myrmex/badge.svg?targetFile=packages%2Fmyrmex%2Fpackage.json)](https://snyk.io/test/github/myrmx/myrmex?targetFile=packages%2Fmyrmex%2Fpackage.json)

Beta version - Formerly named "Lager"

## What is it?

A serverless application builder.

> AWS Lambda + API Gateway + Swagger specification === *Myrmex*

Myrmex helps you to organize your code and deploy serverless applications in AWS. Its plugin system allows you to work with
AWS Lambda or API Gateway or both of them. The IAM plugin can help you to declare the IAM permissions your application needs
in your versionning system.

Control the IAM permissions needed to deploy your application. Allow several developers to publish different versions of the
project on the same AWS account.

Write your own plugins to enrich the command line, create higher level functionalities and integrate with other services.
Then share it as npm modules!

```
$ npm install -g myrmex
$ myrmex new my-serverless-project
$ cd my-serverless-project
$ myrmex -h
```

Documentation available at [https://myrmx.github.io](https://myrmx.github.io).

---

## Code coverage

![Codecov graph](https://codecov.io/gh/myrmx/myrmex/branch/master/graphs/icicle.svg "Code coverage")

---

## Dependencies vulnerabilities

| NPM package         | Analysis                                                                                                                       |
| -------------------:| ------------------------------------------------------------------------------------------------------------------------------ |
|        @myrmex/core | [![Known Vulnerabilities](https://snyk.io/test/npm/@myrmex/core/badge.svg)](https://snyk.io/test/npm/@myrmex/core)             |
|        myrmex (cli) | [![Known Vulnerabilities](https://snyk.io/test/npm/myrmex/badge.svg)](https://snyk.io/test/npm/myrmex)                 |
|         @myrmex/iam | [![Known Vulnerabilities](https://snyk.io/test/npm/@myrmex/iam/badge.svg)](https://snyk.io/test/npm/@myrmex/iam)                 |
|      @myrmex/lambda | [![Known Vulnerabilities](https://snyk.io/test/npm/@myrmex/lambda/badge.svg)](https://snyk.io/test/npm/@myrmex/lambda) |
| @myrmex/api-gateway | [![Known Vulnerabilities](https://snyk.io/test/npm/@myrmex/api-gateway/badge.svg)](https://snyk.io/test/npm/@myrmex/api-gateway) |

---

[MIT](LICENSE)
