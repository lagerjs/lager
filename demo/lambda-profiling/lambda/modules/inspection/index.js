'use strict';

const os = require('os');

module.exports = () => {
  return {
    host: {
      name: os.hostname(),
      architecture: process.arch,
      memory: os.totalmem(),
      cpus: os.cpus()
    },
    os: {
      platform: process.platform,
      release: os.release(),
      uptime: os.uptime()
    },
    user: {
      uid: process.getuid(),
      gid: process.getgid(),
      groups: process.getgroups
    },
    process: {
      command: process.argv,
      execArgs: process.execArgv,
      pid: process.pid,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    },
    exec: {
      env: process.env,
      currentDirectory: process.cwd(),
      // mainModule: process.mainModule,
      config: process.config
    }
  };
};
