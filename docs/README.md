## Based on Jekyll Documentation theme

Instructions: [http://idratherbewriting.com/documentation-theme-jekyll/](http://idratherbewriting.com/documentation-theme-jekyll/)

## Running the site in Docker

You can use Docker to directly build and run the site on your local machine. Just clone the repo and run the following from your working dir:

```
cd
```

Once the build is complete, you can mount and run the whole site as follows:

```
docker run -v "$PWD:/src" -p 4000:4000 lager-docs serve -H 0.0.0.0
```
