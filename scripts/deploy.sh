#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/prismappolice/GRP-AP"
cd "$APP_DIR"

# Runtime data files — modified by admin panel, must never be overwritten by git pull
RUNTIME_FILES=(
  "backend/gallery_uploads/gallery_items.json"
  "backend/news_uploads/latest_news.json"
  "backend/news_uploads/news_items.json"
  "backend/unidentified_uploads/unidentified_bodies.json"
  "backend/managed_content/static_page_content.json"
)

# Step 1: Backup existing data files
echo "==> Backing up runtime data files..."
for f in "${RUNTIME_FILES[@]}"; do
  if [ -f "$f" ]; then
    cp "$f" "$f.bak"
    echo "    Backed up: $f"
  fi
done

# Step 2: Remove untracked copies so git pull can proceed cleanly
for f in "${RUNTIME_FILES[@]}"; do
  [ -f "$f" ] && rm -f "$f"
done

# Step 3: Pull latest code
echo "==> Pulling latest code..."
git pull origin main

# Step 4: Restore data files from backup (never lose admin data)
echo "==> Restoring runtime data files..."
for f in "${RUNTIME_FILES[@]}"; do
  if [ -f "$f.bak" ]; then
    mv "$f.bak" "$f"
    echo "    Restored: $f"
  else
    echo "    No backup found for $f (new install — will be created on first use)"
  fi
done

echo "==> Restarting services..."
sudo systemctl restart postgresql
pm2 restart all --update-env
pm2 save
pm2 status
