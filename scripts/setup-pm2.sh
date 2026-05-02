#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/prismappolice/GRP-AP"
cd "$APP_DIR"

if ! command -v pm2 >/dev/null 2>&1; then
  sudo npm install -g pm2
fi

sudo systemctl enable --now postgresql
pm2 start "$APP_DIR/ecosystem.config.cjs" --update-env
pm2 save
sudo env PATH="$PATH" $(command -v pm2) startup systemd -u "$USER" --hp "$HOME"

echo
pm2 status
echo
echo "Setup complete. Use: bash scripts/restart-services.sh"
