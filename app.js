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
