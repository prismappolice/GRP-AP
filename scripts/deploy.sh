#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/prismappolice/GRP-AP"
cd "$APP_DIR"

# Backup gallery_items.json — managed by admin panel, not tracked in git
GALLERY_JSON="$APP_DIR/backend/gallery_uploads/gallery_items.json"
if [ -f "$GALLERY_JSON" ]; then
    cp "$GALLERY_JSON" /tmp/gallery_items_backup.json
    echo "==> Backed up gallery_items.json"
fi

# Step 1: Pull latest code (content files are now tracked in git)
echo "==> Pulling latest code..."
git pull origin main

# Restore gallery_items.json (git pull deletes it since it was untracked from repo)
if [ -f /tmp/gallery_items_backup.json ]; then
    cp /tmp/gallery_items_backup.json "$GALLERY_JSON"
    echo "==> Restored gallery_items.json"
fi

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
