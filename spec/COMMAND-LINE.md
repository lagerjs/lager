Command line
===

The user should be prompted for every argument that is not provided.
Meanwhile, the user should be able to script the utilization of the command line.

Core plugin
---

```bash
lager new [options] [project-name]                              # create a new project
```

IAM plugin
---

```bash
lager create-policy [policy-identifier]                         # create a new policy
lager create-role [role-identifier]                             # create a new role
lager deploy-policies [policy-identifiers]                      # deploy policies
lager deploy-roles [role-identifiers]                           # deploy roles
```

Api Gateway plugin
---

```bash
lager inspect-endpoint [options] [resource-path] [http-method]  # inspect an endpoint specification
lager create-api [options] [api-identifier]                     # create a new API
lager create-endpoint [options] [resource-path] [http-method]   # create a new API endpoint
lager inspect-api [options] [api-identifier]                    # inspect an api specification
lager deploy-apis [options] [api-identifiers]                   # deploy apis
```

Node Lambda plugin
---

```bash
lager create-lambda [options] [lambda-identifier]               # create a new lambda
```
