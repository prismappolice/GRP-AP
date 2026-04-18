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

pm2 restart all --update-env
pm2 save
pm2 status
