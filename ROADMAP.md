Roadmap
===

General
---

*   ~~Create Github organization~~ (Alexis) **S**
*   ~~Allow plugins to create new lager commands~~ (Alexis) **L**
*   Complete `lager` command line (alexis) **M**
*   Manage IAM credentials from various sources: config file, environment variables, parameters **S**
*   Document IAM permission needed *for each plugin* **M**
*   Add a logging system (use bunyan) **M**
*   Update the dev application to create the "Planet Express" apis **L**
*   Create the notion of `context` (environment + stage/version) **M**
*   Write unit tests
*   ~~Setup continuous integration~~ (Alexis)
*   Setup quality tools (Alexis)
*   Create a local webserver (Koa or Hapi?) **XL**
*   Put core plugins in their own NPM modules **M**
*   Bonus: put the promise based event/observer in its own node module

`api-gateway` core plugin
---

*   ~~Export the "doc" specification with double quotes~~ (Alexis) **S**
*   ~~Put the code about Api and Endpoint definitions in it's own plugin~~ (Alexis) **M**
*   Publish stages (Pedro) **S**
*   Complete `api-gateway` command line (alexis) **XL**
*   ~~Add syntax highlighting to inspection commands~~ **S**
*   Beautify deploy output (ASCII array describing configuration?) **M**

`mock-integration` core plugin
---

*   Create a plugin to handle API Gateway mock integration **L**
*   Implement `mock-integration` command line **M**

`node-lambda` core plugin
---

*   Complete `node-lambda` command line (Alexis) **M**
*   Use aliases for versioning (Pedro) **S**
*   Beautify deploy output **M**

`iam` core plugin
---

*   ~~Create a plugin to create/update/manage IAM roles/policies~~ **L**
*   Implement `iam` command line **M**

Other plugins
---

*   Create a `api-gateway-cors` plugin to allow CORS configuration **L**
*   Create a `api-gateway-self-doc` plugin to inject documentation in the API (Heucles) **S**
*   Create a `sequelize-blueprints` plugin to automatically create REST API when declaring Sequelize models **XL**
*   Create a `dynamodb-blueprints` plugin to automatically create routes to save data in DynamoDB **XL**
*   Create a `cognito` plugin to facilitate cognito integration **XL**
*   Create a `elastic-search` plugin that works on top of `sequelize-blueprints` to automaticaly index records **XL**

Possible side projects
---

*   A NPM module containing the promise based Event/Observer implementation of `Lager`
*   A NPM module that facilitate the use of `inquirer` with `commander`
