/**
 * Zero Downtime Auto Deploy
 */

var cluster = require('cluster');
if (cluster.isMaster) {
  var fs = require('fs');
  var stats = fs.statSync(__filename);
  var spawn = require('child_process').spawn;
  var worker = cluster.fork();
  setInterval(function() {
    // TODO fix this nested spawns
    spawn('gsutil', ['cp', '/var/lib/redis/appendonly.aof', 'gs://limily/redis/'], {
      detached: true,
      stdio: ['ignore', 'ignore', process.stderr]
    }).on('close', function(code) {
      if (code === 0) {
        spawn('git', ['pull', '--ff-only', '--rebase'], {
          cwd: __dirname,
          detached: true,
          stdio: ['ignore', process.stdout, process.stderr],
          uid: stats.uid,
          gid: stats.gid
        }).on('close', function(code) {
          if (code === 0) {
            worker.kill();
          }
        });
      }
    });
  },
  15 * 60 * 1000); // every 15min
  cluster.on('exit', function() {
    if (!Object.keys(cluster.workers).length) {
      worker = cluster.fork();
    }
  });
} else {
  require('./lib/appChild');
  require('./lib/webpage');
}
