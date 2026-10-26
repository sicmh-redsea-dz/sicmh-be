#!/bin/bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
if ! command -v docker >/dev/null; then
  apt-get update
  apt-get install -y docker.io curl python3
fi
systemctl enable --now docker
install -d -m 700 /etc/medit-staging
python3 - <<'PY'
import base64, json, urllib.request
def metadata(path):
    req = urllib.request.Request('http://metadata.google.internal/computeMetadata/v1/' + path, headers={'Metadata-Flavor':'Google'})
    return urllib.request.urlopen(req).read().decode()
project = metadata('project/project-id')
token = json.loads(metadata('instance/service-accounts/default/token'))['access_token']
def secret(name):
    req = urllib.request.Request(f'https://secretmanager.googleapis.com/v1/projects/{project}/secrets/{name}/versions/latest:access', headers={'Authorization':'Bearer ' + token})
    return base64.b64decode(json.load(urllib.request.urlopen(req))['payload']['data']).decode()
root = secret('medit-staging-mysql-root')
password = secret('medit-staging-db-password')
with open('/etc/medit-staging/mysql.env', 'w') as f:
    f.write('MYSQL_ROOT_PASSWORD=' + root + '\n')
with open('/etc/medit-staging/01-databases.sql', 'w') as f:
    f.write("CREATE DATABASE IF NOT EXISTS medit_qa_global;\nCREATE DATABASE IF NOT EXISTS medit;\n")
    f.write("CREATE USER IF NOT EXISTS 'medit_staging'@'%' IDENTIFIED BY '" + password + "';\n")
    f.write("GRANT ALL PRIVILEGES ON medit_qa_global.* TO 'medit_staging'@'%';\n")
    f.write("GRANT ALL PRIVILEGES ON medit.* TO 'medit_staging'@'%';\n")
PY
chmod 600 /etc/medit-staging/*
chmod 644 /etc/medit-staging/01-databases.sql
if ! docker container inspect medit-staging-mysql >/dev/null 2>&1; then
  docker run -d --name medit-staging-mysql --restart unless-stopped \
    --env-file /etc/medit-staging/mysql.env \
    --publish 10.24.0.10:3306:3306 \
    --mount source=medit-staging-mysql-data,target=/var/lib/mysql \
    --mount type=bind,source=/etc/medit-staging/01-databases.sql,target=/docker-entrypoint-initdb.d/01-databases.sql,readonly \
    --health-cmd='mysqladmin ping -h 127.0.0.1 --silent' \
    --health-interval=10s --health-timeout=5s --health-retries=12 \
    mysql:8.0.46
fi
