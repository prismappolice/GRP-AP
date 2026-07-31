# GRP-AP Emergency Backup Instructions

## మీ VM నుండి data retrieve చేయడానికి steps:

### Option 1: PowerShell Script (Recommended for Windows)

1. **PowerShell open చేయండి** (Run as Administrator)

2. **Script run చేయండి:**
   ```powershell
   cd d:\Projects\GRP-AP\scripts
   .\emergency_backup_from_vm.ps1
   ```

3. **If VM name doesn't work, use external IP:**
   ```powershell
   # GCP Console నుండి external IP copy చేయండి
   .\emergency_backup_from_vm.ps1 -VMHost "34.93.xxx.xxx"
   ```

### Option 2: Manual SSH Commands (If script fails)

**First, SSH into your VM:**
```bash
# Using gcloud (if still authenticated)
gcloud compute ssh grp-ap --zone=asia-south1-b

# OR using SSH directly with external IP
ssh prismappolice@<EXTERNAL_IP>
```

**Then run these commands on the VM:**

```bash
# 1. Backup Database
cd /home/prismappolice/GRP-AP
sudo -u postgres pg_dump -Fc -f ~/grp_db_backup.dump grp_db
sudo -u postgres pg_dump -f ~/grp_db_backup.sql grp_db
sudo chown prismappolice:prismappolice ~/grp_db_backup.*

# 2. Backup Upload Files
cd /home/prismappolice/GRP-AP/backend
tar -czf ~/grp_uploads_backup.tar.gz \
    complaint_uploads/ \
    gallery_uploads/ \
    news_uploads/ \
    unidentified_uploads/

# 3. Backup Configs
cd /home/prismappolice/GRP-AP
tar -czf ~/grp_config_backup.tar.gz \
    backend/.env \
    frontend/.env \
    alembic.ini \
    ecosystem.config.cjs \
    scripts/nginx-grp.conf

# 4. Check file sizes
ls -lh ~/*.dump ~/*.tar.gz
```

**Download files to your local machine:**

Open PowerShell on your Windows machine:
```powershell
cd d:\Projects\GRP-AP

# Create backup folder
mkdir vm_backup
cd vm_backup

# Download all backup files
scp prismappolice@<VM_IP>:~/grp_db_backup.dump ./
scp prismappolice@<VM_IP>:~/grp_db_backup.sql ./
scp prismappolice@<VM_IP>:~/grp_uploads_backup.tar.gz ./
scp prismappolice@<VM_IP>:~/grp_config_backup.tar.gz ./
```

### Option 3: Using gcloud compute scp (If authenticated)

```powershell
cd d:\Projects\GRP-AP
mkdir vm_backup
cd vm_backup

# Download using gcloud
gcloud compute scp grp-ap:~/grp_db_backup.dump ./ --zone=asia-south1-b
gcloud compute scp grp-ap:~/grp_db_backup.sql ./ --zone=asia-south1-b
gcloud compute scp grp-ap:~/grp_uploads_backup.tar.gz ./ --zone=asia-south1-b
gcloud compute scp grp-ap:~/grp_config_backup.tar.gz ./ --zone=asia-south1-b
```

---

## What You'll Get:

1. **grp_db_backup.dump** - Full database (binary format)
2. **grp_db_backup.sql** - Full database (SQL text)
3. **grp_uploads_backup.tar.gz** - All uploaded files (images, documents)
4. **grp_config_backup.tar.gz** - All configuration files

---

## After Download:

### Extract uploads:
```powershell
# You'll need 7-Zip or similar tool for .tar.gz on Windows
# Or use WSL:
wsl tar -xzf grp_uploads_backup.tar.gz
wsl tar -xzf grp_config_backup.tar.gz
```

### Restore database (when you set up new server):
```bash
# On new server
pg_restore -d grp_db grp_db_backup.dump
```

---

## Important Notes:

⚠️ **Do this ASAP** - Your GCP account payment issue తర్వాత VM delete అవ్వచ్చు

✅ **Keep multiple copies** - External hard drive, Google Drive, etc.

✅ **Total size estimate** - Probably 100MB - 2GB depending on uploads

---

## Troubleshooting:

**If SSH doesn't work:**
- Check if your GCP billing is completely disabled
- Try using gcloud SDK: `gcloud auth login`
- Check firewall rules allow SSH (port 22)

**If permission denied:**
- Use `sudo` for database commands
- Check user is `prismappolice`

**If files too large:**
- Download one by one instead of script
- Use compression: `-9` for maximum compression

---

## Quick One-Liner (Emergency):

If you just want database dump quickly:
```bash
ssh prismappolice@grp-ap "sudo -u postgres pg_dump grp_db" > grp_db_backup.sql
```

This saves the database directly to your local machine.
