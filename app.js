/**
 * Zero Downtime Auto Deploy
 */

var cluster = require('cluster');
var log = require('util').log;
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
        //var newWorker = cluster.fork().on('listening', function(w, address) {
        //  log('A new server is listening to ' + address.address + ':' + address.port);
        //  worker.kill();
        //  worker = newWorker;
        //});
        worker.kill();
      }
    });
  },
  15 * 60 * 1000); // every 15min
  cluster.on('exit', function() {
    if (!Object.keys(cluster.workers).length) {
      worker = cluster.fork().on('listening', function(w, address) {
        log('A new server is listening to ' + address.address + ':' + address.port);
      });
    }
  });
} else {
  require('./lib/appChild');
}
