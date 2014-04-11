export PATH=$PATH:/usr/local/bin
export NODE_PATH=$NODE_PATH:/usr/local/lib/node_modules
git clone https://github.com/kazuyukitanimura/myspecreader.git && cd myspecreader
npm install -g node-dev && npm install
NODEDEV=`which node-dev`
DIR=`pwd`
FILE=app.js

chmod a+r $DIR/$FILE

cat <<EOF >/etc/init.d/nodejs
#!/bin/sh

PIDFILE=/var/run/nodejs.pid
NODE="$NODEDEV $DIR/$FILE"
export PATH=$PATH:/usr/local/bin
export NODE_PATH=$NODE_PATH:/usr/local/lib/node_modules

. /lib/init/vars.sh
. /lib/lsb/init-functions

do_start()
{
  start-stop-daemon --start --chuid nobody --quiet --pidfile \$PIDFILE --background --exec \$NODE  || { log_daemon_msg " NodeJS already running."; return 1; }

  start-stop-daemon --start --chuid nobody --quiet --make-pidfile --pidfile \$PIDFILE --background --exec \$NODE || { log_daemon_msg " Failed to start NodeJS."; return 2; }
}

case "\$1" in
  start)
    do_start
    ;;
  *)
    echo "Usage: nodejs start"
    exit 3
    ;;
esac
EOF

chmod a+x /etc/init.d/nodejs
