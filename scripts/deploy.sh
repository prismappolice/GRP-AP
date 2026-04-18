#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/prismappolice/GRP-AP"
cd "$APP_DIR"

# Step 1: Pull latest code (content files are now tracked in git)
echo "==> Pulling latest code..."
git pull origin main

echo "==> Restarting services..."
sudo systemctl restart postgresql

echo "==> Building frontend..."
cd "$APP_DIR/frontend" && npm run build
cd "$APP_DIR"

echo "==> Copying build to nginx root..."
sudo find /var/www/grp -mindepth 1 -delete
sudo cp -r "$APP_DIR/frontend/build/." /var/www/grp/
echo "    Done. Files: $(ls /var/www/grp/static/js/ | wc -l) JS chunks"

pm2 restart all --update-env
pm2 save
pm2 status
