export NODE_PATH=$NODE_PATH:/usr/local/lib/node_modules
curl -L https://npmjs.org/install.sh | sh # this might not necessary
git clone https://github.com/kazuyukitanimura/myspecreader.git && cd myspecreader && npm install
DIR=`pwd`
FILE=app.js
LOGDIR=/var/log/forever
mkdir -p $LOGDIR
LOGFILE=$LOGDIR/appjs.log

chmod a+r $DIR/$FILE

cat <<EOF >/etc/logrotate.d/appjs
\$LOGFILE {
  weekly
  missingok
  copytruncate
  rotate 4
  compress
  notifempty
}
EOF

cat <<EOF >/etc/init.d/nodejs
#!/bin/sh

PIDFILE=/var/run/nodejs.pid
FOREVER="\$DIR/node_modules/forever/bin/forever"
NODE="\$FOREVER \$DIR/\$FILE"
export NODE_PATH=\$NODE_PATH:/usr/local/lib/node_modules

. /lib/init/vars.sh
. /lib/lsb/init-functions

do_start()
{
  /sbin/start-stop-daemon --start --quiet --pidfile \$PIDFILE --background --exec /bin/bash -- -c "exec \$NODE >> \$LOGFILE 2>&1" || { log_daemon_msg " start-stop-daemon failed to run \$NODE"; return 1; }
}

do_stop()
{
  \$FOREVER stopall
  /sbin/start-stop-daemon --stop --name node
}

do_restart()
{
  \$FOREVER restartall
}

case "\$1" in
  start)
    do_start
    ;;
  stop)
    do_stop
    ;;
  restart)
    do_restart
    ;;
  *)
    echo "Usage: nodejs start"
    exit 3
    ;;
esac
EOF

chmod a+x /etc/init.d/nodejs
