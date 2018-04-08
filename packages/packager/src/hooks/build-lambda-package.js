'use strict';

const os = require('os');
const path = require('path');
const Promise = require('bluebird');
const exec = Promise.promisify(require('child_process').exec, {multiArgs: true});
const fs = require('fs-extra');
const archiver = require('archiver');
const AWS = require('aws-sdk');
const plugin = require('../index');
const s3 = new AWS.S3();

const DEPENDENCIES_DIR_NAME = 'myrmex-tmp-dependencies-dir';
const managedRuntimes = ['nodejs4.3', 'nodejs6.10', 'nodejs8.10', 'python2.7', 'python3.6'];

module.exports = function buildLambdaPackageHook(lambda, context, codeParams) {
  // Shorcut: if the runtime is not managed by the plugin, we skip this hook
  if (managedRuntimes.indexOf(lambda.getRuntime()) === -1) {
    return Promise.resolve();
  }

  const packagerIdentifier = plugin.myrmex.getConfig('packager.lambdaIdentifier');

  // Shortcut: the Lambda of the packager must be deployed with the default packager of the plugin @myrmex/lambda
  if (lambda.getIdentifier() === packagerIdentifier) {
    return Promise.resolve();
  }

  let packageName = context.environment ? context.environment + '_' : '';
  packageName += lambda.getIdentifier();
  packageName += context.alias ? '_' + context.alias : '';

  const sourcesPath = path.join(os.tmpdir(), 'lambda-packages', packageName);
  const zipPath = sourcesPath + '.zip';

  // Remove previous content
  return fs.remove(sourcesPath)
  .then(() => {
    return prepareSources(lambda.getFsPath(), sourcesPath, lambda.getRuntime());
  })
  .then(() => {
    // Install dependencies
    return install(sourcesPath, lambda.getRuntime());
  })
  .spread((stdout, stderr) => {
    if (plugin.myrmex.getConfig('packager.docker.showStdout')) {
      plugin.myrmex.call('cli:print', stdout);
      plugin.myrmex.call('cli:print', stderr);
    }
    // Remove useless files
    return fs.remove(path.join(sourcesPath, DEPENDENCIES_DIR_NAME));
  })
  .then(() => {
    // Create zip of the Lambda (without installing dependencies)
    return archive(sourcesPath, zipPath);
  })
  .then(zipData => {
    if (plugin.myrmex.getConfig('packager.bucket')) {
      // Upload zip to S3
      var params = {
        Body: zipData,
        Bucket: plugin.myrmex.getConfig('packager.bucket'),
        Key: packageName + '.zip'
      };
      return putObject(params)
      .then(response => {
        // Retrieve the location of the final zip on S3
        codeParams.S3Bucket = plugin.myrmex.getConfig('packager.bucket');
        codeParams.S3Key = packageName + '.zip';
        return Promise.resolve(codeParams);
      });
    }
    codeParams.ZipFile = zipData;
    return Promise.resolve(codeParams);
  });
};

const exclusions = ['node_modules'];
function copyFilter(src) {
  let includePath = true;
  exclusions.forEach(excludedPath => {
    if (src.substr(-excludedPath.length) === excludedPath) {
      includePath = false;
    }
  });
  return includePath;
}

function prepareSources(modulePath, sourcesPath, runtime) {
  const rewrittenDependencies = {};
  // Create a folder to put the Lambda sources
  return fs.mkdirp(sourcesPath)
  .then(() => {
    // Copy sources
    return fs.copy(modulePath, sourcesPath, { filter: copyFilter });
  })
  .then(() => {
    // Shortcut: the next part is relevant only for node
    if (['nodejs4.3', 'nodejs6.10', 'nodejs8.10'].indexOf(runtime) === -1) {
      return Promise.resolve();
    }

    // Retrieve dependencies on file system from package.json
    const packageJson = JSON.parse(JSON.stringify(require(path.join(modulePath, 'package.json'))));
    const dependencies = packageJson.dependencies;

    // Shortcut
    if (!dependencies) { return Promise.resolve(); }

    // We declare an array that will be filed with promises that performs operations on the file system
    const promises = [];
    const keys = Object.keys(dependencies);
    keys.forEach(k => {
      let localDependencyPath;
      if (dependencies[k].substr(0, 7) === 'file://') {
        localDependencyPath = path.join(modulePath, dependencies[k].substr(7));
      } else if (dependencies[k].substr(0, 1) === '.') {
        localDependencyPath = path.join(modulePath, dependencies[k]);
      }
      if (localDependencyPath) {
        const tmpDependencyPath = path.join(sourcesPath, DEPENDENCIES_DIR_NAME, k);
        promises.push(prepareSources(localDependencyPath, tmpDependencyPath, runtime));
        rewrittenDependencies[k] = './' + DEPENDENCIES_DIR_NAME + '/' + k;
      } else {
        rewrittenDependencies[k] = dependencies[k];
      }
    });
    if (promises.length > 0) {
      packageJson.dependencies = rewrittenDependencies;
      promises.push(fs.writeJson(path.join(sourcesPath, 'package.json'), packageJson));
      return Promise.all(promises);
    }
    return Promise.resolve();
  });
}

function install(sourcesPath, runtime) {
  const uid = process.getuid();
  const gid = process.getgid();
  let cmd = plugin.myrmex.getConfig('packager.docker.useSudo') ? 'sudo ' : '';
  cmd += 'docker run --rm -v ' + sourcesPath + ':/data';
  switch (runtime) {
    case 'nodejs4.3':
      cmd += ' -e RUNTIME=node4';
      break;
    case 'python2.7':
      cmd += ' -e RUNTIME=python';
      break;
    case 'python3.6':
      cmd += ' -e RUNTIME=python3';
      break;
  }
  if (uid) { cmd += ' -e HOST_UID=' + uid; }
  if (gid) { cmd += ' -e HOST_GID=' + gid; }
  cmd += ' myrmex/lambda-packager';
  if (plugin.myrmex.getConfig('packager.docker.showStdout')) {
    const printCmd = plugin.myrmex.call('cli:format', 'cmd', cmd);
    plugin.myrmex.call('cli:print', '\nPackage installation:\n    ' + printCmd + '\n');
  }
  return exec(cmd);
}

function archive(origPath, archivePath) {
  return new Promise((resolve, reject) => {
    const outputStream = fs.createWriteStream(archivePath);
    const archive = archiver.create('zip', {});
    outputStream.on('close', () => {
      fs.readFile(archivePath, (e, data) => {
        if (e) { return reject(e); }
        resolve(data);
      });
    });

    archive.on('error', e => {
      reject(e);
    });

    archive.pipe(outputStream);

    // Add the Lamba code to the archive
    archive.directory(origPath, '');

    archive.finalize();
  });
}


function putObject(params) {
  return s3.putObject(params).promise()
  .catch(e => {
    // If the bucket does not exists, we create it
    if (e.code === 'NoSuchBucket') {
      return s3.createBucket({ Bucket: params.Bucket }).promise()
      .then(() => {
        return putObject(params);
      });
    }
    return Promise.reject(e);
  });
}
