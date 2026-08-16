#!/bin/bash
docker inspect dashboard --format '{{json .Config.Labels}}' | python3 -c "import sys,json; d=json.load(sys.stdin); print('workdir', d.get('com.docker.compose.project.working_dir')); print('config', d.get('com.docker.compose.project.config_files')); print('project', d.get('com.docker.compose.project'))"
find /home /opt /srv -maxdepth 4 -type d \( -name Dashboard -o -name dashboard \) 2>/dev/null | head -40
ls -la /opt/docker 2>/dev/null | head
