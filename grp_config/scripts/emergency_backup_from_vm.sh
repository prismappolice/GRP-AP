#!/usr/bin/env bash
# Emergency backup script to retrieve all data from GRP-AP VM
# Run this script from your local machine while you still have SSH access

set -euo pipefail

VM_USER="prismappolice"
VM_HOST="grp-ap"  # or use external IP if needed
VM_IP="10.160.0.8"  # Internal IP from screenshot
APP_DIR="/home/prismappolice/GRP-AP"
BACKUP_DIR="./vm_backup_$(date +%Y%m%d_%H%M%S)"

echo "==> Creating local backup directory: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"
cd "$BACKUP_DIR"

# Step 1: Dump PostgreSQL Database
echo ""
echo "==> Step 1: Dumping PostgreSQL database..."
ssh ${VM_USER}@${VM_HOST} "
    cd $APP_DIR
    source backend/.env 2>/dev/null || true
    
    # Extract DB credentials from .env
    DB_NAME='grp_db'
    DB_USER='postgres'
    
    echo '  -> Creating database dump...'
    sudo -u postgres pg_dump -Fc -f /tmp/grp_db_backup.dump $DB_NAME
    
    # Also create a SQL text dump for easier inspection
    sudo -u postgres pg_dump -f /tmp/grp_db_backup.sql $DB_NAME
    
    # Change permissions so we can download
    sudo chmod 644 /tmp/grp_db_backup.dump /tmp/grp_db_backup.sql
    
    echo '  -> Database dump created: /tmp/grp_db_backup.dump'
    echo '  -> SQL dump created: /tmp/grp_db_backup.sql'
"

echo "  -> Downloading database dumps..."
scp ${VM_USER}@${VM_HOST}:/tmp/grp_db_backup.dump ./
scp ${VM_USER}@${VM_HOST}:/tmp/grp_db_backup.sql ./
echo "  ✓ Database backups downloaded"

# Step 2: Backup all upload folders
echo ""
echo "==> Step 2: Archiving upload folders..."
ssh ${VM_USER}@${VM_HOST} "
    cd $APP_DIR/backend
    
    echo '  -> Creating archive of all uploads...'
    tar -czf /tmp/grp_uploads_backup.tar.gz \
        complaint_uploads/ \
        gallery_uploads/ \
        news_uploads/ \
        unidentified_uploads/ \
        2>/dev/null || echo 'Some folders may be empty'
    
    echo '  -> Upload archive created'
"

echo "  -> Downloading upload archives..."
scp ${VM_USER}@${VM_HOST}:/tmp/grp_uploads_backup.tar.gz ./
echo "  ✓ Upload files downloaded"

# Step 3: Backup configuration files
echo ""
echo "==> Step 3: Backing up configuration files..."
ssh ${VM_USER}@${VM_HOST} "
    cd $APP_DIR
    
    echo '  -> Creating config archive...'
    tar -czf /tmp/grp_config_backup.tar.gz \
        backend/.env \
        frontend/.env \
        alembic.ini \
        ecosystem.config.cjs \
        scripts/nginx-grp.conf \
        2>/dev/null || true
    
    echo '  -> Config archive created'
"

echo "  -> Downloading configuration..."
scp ${VM_USER}@${VM_HOST}:/tmp/grp_config_backup.tar.gz ./
echo "  ✓ Configuration files downloaded"

# Step 4: Get Nginx configuration
echo ""
echo "==> Step 4: Backing up Nginx configuration..."
ssh ${VM_USER}@${VM_HOST} "
    sudo tar -czf /tmp/grp_nginx_config.tar.gz \
        /etc/nginx/sites-available/grp \
        /etc/nginx/sites-enabled/grp \
        2>/dev/null || true
    sudo chmod 644 /tmp/grp_nginx_config.tar.gz
"
scp ${VM_USER}@${VM_HOST}:/tmp/grp_nginx_config.tar.gz ./ || echo "  ! Nginx config not found (optional)"

# Step 5: Get PM2 configuration
echo ""
echo "==> Step 5: Backing up PM2 status..."
ssh ${VM_USER}@${VM_HOST} "
    pm2 save
    pm2 list > /tmp/pm2_status.txt 2>&1 || true
    pm2 env 0 > /tmp/pm2_env.txt 2>&1 || true
"
scp ${VM_USER}@${VM_HOST}:/tmp/pm2_status.txt ./ || true
scp ${VM_USER}@${VM_HOST}:/tmp/pm2_env.txt ./ || true

# Step 6: Cleanup remote temp files
echo ""
echo "==> Step 6: Cleaning up temporary files on VM..."
ssh ${VM_USER}@${VM_HOST} "
    rm -f /tmp/grp_db_backup.dump \
          /tmp/grp_db_backup.sql \
          /tmp/grp_uploads_backup.tar.gz \
          /tmp/grp_config_backup.tar.gz \
          /tmp/grp_nginx_config.tar.gz \
          /tmp/pm2_status.txt \
          /tmp/pm2_env.txt
    echo '  ✓ Cleanup complete'
"

# Create a backup manifest
echo ""
echo "==> Creating backup manifest..."
cat > BACKUP_MANIFEST.txt << EOF
GRP-AP Emergency Backup
Created: $(date)
VM: ${VM_HOST} (${VM_IP})
User: ${VM_USER}

Files included:
- grp_db_backup.dump (PostgreSQL binary dump)
- grp_db_backup.sql (SQL text dump)
- grp_uploads_backup.tar.gz (All upload folders)
- grp_config_backup.tar.gz (Configuration files)
- grp_nginx_config.tar.gz (Nginx configuration)
- pm2_status.txt (PM2 process status)
- pm2_env.txt (PM2 environment variables)

Backup size: $(du -sh . | cut -f1)

To restore database:
  pg_restore -d new_grp_db grp_db_backup.dump

To extract uploads:
  tar -xzf grp_uploads_backup.tar.gz

To extract configs:
  tar -xzf grp_config_backup.tar.gz
EOF

echo ""
echo "=========================================="
echo "✓ BACKUP COMPLETE!"
echo "=========================================="
echo "Backup location: $BACKUP_DIR"
echo "Total size: $(du -sh . | cut -f1)"
echo ""
echo "Files backed up:"
ls -lh
echo ""
echo "Keep this backup safe! Your VM data is now preserved."
echo "=========================================="
