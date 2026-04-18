#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/prismappolice/GRP-AP"
cd "$APP_DIR"

# Backup all admin-managed uploads (images + JSONs) — NOT in git, managed via admin panel
echo "==> Backing up admin uploads..."
rm -rf /tmp/bk_gallery_uploads /tmp/bk_news_uploads /tmp/bk_unidentified_uploads
cp -r "$APP_DIR/backend/gallery_uploads"       /tmp/bk_gallery_uploads
cp -r "$APP_DIR/backend/news_uploads"          /tmp/bk_news_uploads
cp -r "$APP_DIR/backend/unidentified_uploads"  /tmp/bk_unidentified_uploads
echo "==> Backed up gallery($(ls /tmp/bk_gallery_uploads | wc -l)), news($(ls /tmp/bk_news_uploads | wc -l)), unidentified($(ls /tmp/bk_unidentified_uploads | wc -l)) files"

# Step 1: Pull latest code
echo "==> Pulling latest code..."
git pull origin main

# Restore all admin-managed uploads after pull (git pull may delete previously-tracked files)
echo "==> Restoring admin uploads..."
cp -r /tmp/bk_gallery_uploads/.       "$APP_DIR/backend/gallery_uploads/"
cp -r /tmp/bk_news_uploads/.          "$APP_DIR/backend/news_uploads/"
cp -r /tmp/bk_unidentified_uploads/.  "$APP_DIR/backend/unidentified_uploads/"
echo "==> Restored all uploads"

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
