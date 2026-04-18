#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/prismappolice/GRP-AP"
cd "$APP_DIR"

# Backup all admin-managed JSONs — these are NOT in git, managed via admin panel
backup_file() {
    local src="$1" dst="$2"
    [ -f "$src" ] && cp "$src" "$dst" && echo "==> Backed up $(basename $src)"
}
backup_file "$APP_DIR/backend/gallery_uploads/gallery_items.json"       /tmp/bk_gallery_items.json
backup_file "$APP_DIR/backend/news_uploads/news_items.json"             /tmp/bk_news_items.json
backup_file "$APP_DIR/backend/news_uploads/latest_news.json"            /tmp/bk_latest_news.json
backup_file "$APP_DIR/backend/unidentified_uploads/unidentified_bodies.json" /tmp/bk_unidentified_bodies.json
backup_file "$APP_DIR/backend/managed_content/static_page_content.json" /tmp/bk_static_page_content.json

# Step 1: Pull latest code
echo "==> Pulling latest code..."
git pull origin main

# Restore admin-managed JSONs after pull
restore_file() {
    local src="$1" dst="$2"
    [ -f "$src" ] && cp "$src" "$dst" && echo "==> Restored $(basename $dst)"
}
restore_file /tmp/bk_gallery_items.json        "$APP_DIR/backend/gallery_uploads/gallery_items.json"
restore_file /tmp/bk_news_items.json           "$APP_DIR/backend/news_uploads/news_items.json"
restore_file /tmp/bk_latest_news.json          "$APP_DIR/backend/news_uploads/latest_news.json"
restore_file /tmp/bk_unidentified_bodies.json  "$APP_DIR/backend/unidentified_uploads/unidentified_bodies.json"
restore_file /tmp/bk_static_page_content.json  "$APP_DIR/backend/managed_content/static_page_content.json"

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
