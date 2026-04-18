#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/prismappolice/GRP-AP"
cd "$APP_DIR"

# Untrack runtime data files (admin-modified JSONs) if still tracked in git index
RUNTIME_FILES=(
  "backend/gallery_uploads/gallery_items.json"
  "backend/news_uploads/latest_news.json"
  "backend/news_uploads/news_items.json"
  "backend/unidentified_uploads/unidentified_bodies.json"
  "backend/managed_content/static_page_content.json"
)
for f in "${RUNTIME_FILES[@]}"; do
  if git ls-files --error-unmatch "$f" 2>/dev/null; then
    echo "Untracking runtime file: $f"
    git rm --cached "$f"
  fi
done

git pull origin main

sudo systemctl restart postgresql
pm2 restart all --update-env
pm2 save
pm2 status
