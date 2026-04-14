#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/prismappolice/GRP-AP"
cd "$APP_DIR"

sudo systemctl restart postgresql
pm2 restart all --update-env
pm2 save
pm2 status
