#!/bin/bash
docker run -v "$PWD:/src" -p 4000:4000 lager-doc serve -H 0.0.0.0
