#!/bin/bash
lerna clean --yes
lerna exec rm npm-shrinkwrap.json -- -f
lerna exec ncu -- -u
lerna exec npm install
lerna publish --skip-git --skip-npm
lerna exec npm shrinkwrap
npm test
