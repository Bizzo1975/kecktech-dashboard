#!/bin/sh
# Host-side build wrapper — called by kecktech-admin container via bind mount
cd /opt/docker/dashboard/website
/usr/bin/node /usr/lib/node_modules/npm/bin/npm-cli.js run build 2>&1
