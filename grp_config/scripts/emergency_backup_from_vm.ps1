# Emergency backup script to retrieve all data from GRP-AP VM
# Run this script from PowerShell on your local Windows machine

param(
    [string]$VMHost = "grp-ap",
    [string]$VMUser = "prismappolice",
    [string]$UseExternalIP = $false
)

$ErrorActionPreference = "Continue"
$AppDir = "/home/prismappolice/GRP-AP"
$BackupDir = ".\vm_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"

Write-Host "==> Creating local backup directory: $BackupDir" -ForegroundColor Green
New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
Set-Location $BackupDir

# If you need to use external IP instead of VM name
if ($UseExternalIP) {
    Write-Host "NOTE: You may need to use the external IP from GCP console" -ForegroundColor Yellow
    Write-Host "Example: .\emergency_backup_from_vm.ps1 -VMHost '34.93.xxx.xxx'" -ForegroundColor Yellow
}

$SSHTarget = "${VMUser}@${VMHost}"

Write-Host ""
Write-Host "==> Step 1: Dumping PostgreSQL database..." -ForegroundColor Cyan

# Create database dumps on VM
$dbDumpScript = @"
cd $AppDir
source backend/.env 2>/dev/null || true

DB_NAME='grp_db'
DB_USER='postgres'

echo '  -> Creating database dump...'
sudo -u postgres pg_dump -Fc -f /tmp/grp_db_backup.dump `$DB_NAME
sudo -u postgres pg_dump -f /tmp/grp_db_backup.sql `$DB_NAME

sudo chmod 644 /tmp/grp_db_backup.dump /tmp/grp_db_backup.sql

echo '  -> Database dumps created'
ls -lh /tmp/grp_db_backup.*
"@

ssh $SSHTarget $dbDumpScript

Write-Host "  -> Downloading database dumps..." -ForegroundColor Yellow
scp "${SSHTarget}:/tmp/grp_db_backup.dump" ./
scp "${SSHTarget}:/tmp/grp_db_backup.sql" ./
Write-Host "  ✓ Database backups downloaded" -ForegroundColor Green

# Step 2: Backup all upload folders
Write-Host ""
Write-Host "==> Step 2: Archiving upload folders..." -ForegroundColor Cyan

$uploadScript = @"
cd $AppDir/backend

echo '  -> Creating archive of all uploads...'
tar -czf /tmp/grp_uploads_backup.tar.gz \
    complaint_uploads/ \
    gallery_uploads/ \
    news_uploads/ \
    unidentified_uploads/ \
    2>/dev/null || echo 'Some folders may be empty'

ls -lh /tmp/grp_uploads_backup.tar.gz
"@

ssh $SSHTarget $uploadScript

Write-Host "  -> Downloading upload archives..." -ForegroundColor Yellow
scp "${SSHTarget}:/tmp/grp_uploads_backup.tar.gz" ./
Write-Host "  ✓ Upload files downloaded" -ForegroundColor Green

# Step 3: Backup configuration files
Write-Host ""
Write-Host "==> Step 3: Backing up configuration files..." -ForegroundColor Cyan

$configScript = @"
cd $AppDir

echo '  -> Creating config archive...'
tar -czf /tmp/grp_config_backup.tar.gz \
    backend/.env \
    frontend/.env \
    alembic.ini \
    ecosystem.config.cjs \
    scripts/nginx-grp.conf \
    2>/dev/null || true

ls -lh /tmp/grp_config_backup.tar.gz
"@

ssh $SSHTarget $configScript

Write-Host "  -> Downloading configuration..." -ForegroundColor Yellow
scp "${SSHTarget}:/tmp/grp_config_backup.tar.gz" ./
Write-Host "  ✓ Configuration files downloaded" -ForegroundColor Green

# Step 4: Get Nginx configuration
Write-Host ""
Write-Host "==> Step 4: Backing up Nginx configuration..." -ForegroundColor Cyan

$nginxScript = @"
sudo tar -czf /tmp/grp_nginx_config.tar.gz \
    /etc/nginx/sites-available/grp \
    /etc/nginx/sites-enabled/grp \
    2>/dev/null || true
sudo chmod 644 /tmp/grp_nginx_config.tar.gz
"@

ssh $SSHTarget $nginxScript
scp "${SSHTarget}:/tmp/grp_nginx_config.tar.gz" ./ 2>$null

# Step 5: Get PM2 configuration
Write-Host ""
Write-Host "==> Step 5: Backing up PM2 status..." -ForegroundColor Cyan

$pm2Script = @"
pm2 save
pm2 list > /tmp/pm2_status.txt 2>&1 || true
pm2 env 0 > /tmp/pm2_env.txt 2>&1 || true
"@

ssh $SSHTarget $pm2Script
scp "${SSHTarget}:/tmp/pm2_status.txt" ./ 2>$null
scp "${SSHTarget}:/tmp/pm2_env.txt" ./ 2>$null

# Step 6: Cleanup remote temp files
Write-Host ""
Write-Host "==> Step 6: Cleaning up temporary files on VM..." -ForegroundColor Cyan

$cleanupScript = @"
rm -f /tmp/grp_db_backup.dump \
      /tmp/grp_db_backup.sql \
      /tmp/grp_uploads_backup.tar.gz \
      /tmp/grp_config_backup.tar.gz \
      /tmp/grp_nginx_config.tar.gz \
      /tmp/pm2_status.txt \
      /tmp/pm2_env.txt
echo '  ✓ Cleanup complete'
"@

ssh $SSHTarget $cleanupScript

# Create a backup manifest
Write-Host ""
Write-Host "==> Creating backup manifest..." -ForegroundColor Cyan

$manifest = @"
GRP-AP Emergency Backup
Created: $(Get-Date)
VM: $VMHost
User: $VMUser

Files included:
- grp_db_backup.dump (PostgreSQL binary dump)
- grp_db_backup.sql (SQL text dump)
- grp_uploads_backup.tar.gz (All upload folders)
- grp_config_backup.tar.gz (Configuration files)
- grp_nginx_config.tar.gz (Nginx configuration)
- pm2_status.txt (PM2 process status)
- pm2_env.txt (PM2 environment variables)

To restore database:
  pg_restore -d new_grp_db grp_db_backup.dump

To extract uploads:
  tar -xzf grp_uploads_backup.tar.gz

To extract configs:
  tar -xzf grp_config_backup.tar.gz

Total files:
$((Get-ChildItem -File | Measure-Object).Count) files
"@

$manifest | Out-File -FilePath "BACKUP_MANIFEST.txt" -Encoding UTF8

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "✓ BACKUP COMPLETE!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host "Backup location: $BackupDir"
Write-Host ""
Write-Host "Files backed up:"
Get-ChildItem -File | Format-Table Name, Length, LastWriteTime
Write-Host ""
Write-Host "Keep this backup safe! Your VM data is now preserved." -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Green
