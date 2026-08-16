#!/bin/bash
set -eu
cd /opt/farmbot/Farmbot-Web-App
cp config/application.rb "config/application.rb.bak.xfo.$(date +%Y%m%d%H%M%S)"
if grep -q 'x_frame_options' config/application.rb; then
  sed -i 's/config\.x_frame_options.*/config.x_frame_options = SecureHeaders::OPT_OUT/' config/application.rb
else
  sed -i "/SecureHeaders::Configuration.default/a\\    config.x_frame_options = SecureHeaders::OPT_OUT" config/application.rb
fi
grep -n 'x_frame_options\|frame_ancestors' config/application.rb
docker compose restart web
sleep 18
curl -fsSI http://127.0.0.1:3000/ | grep -iE 'HTTP/|x-frame|frame-ancestors' || true
echo DONE_XFO
