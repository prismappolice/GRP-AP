# GRP AP Security Deployment Checklist

Use this after pulling the latest code on the live server.

## 1. Backup First

```bash
pg_dump "$DATABASE_URL" > grp_db_before_security_update.sql
tar -czf grp_uploads_before_security_update.tar.gz backend/gallery_uploads backend/news_uploads backend/unidentified_uploads backend/complaint_uploads
```

## 2. Environment Secrets

Confirm these are set on live and are not committed to git:

```bash
echo "$DATABASE_URL"
echo "$JWT_SECRET_KEY"
echo "$SMTP_HOST"
echo "$SMTP_USER"
```

Do not print `SMTP_PASSWORD` or database passwords in screenshots.

## 3. Deploy Code

```bash
git pull
cd frontend
npm install
npm run build
cd ../backend
pip install -r requirements.txt
```

Restart the backend service after deployment. Startup creates these new tables if they are missing:

- `audit_logs`
- `login_attempts`
- `help_request_replies`

Backend service hardening:

- Run Uvicorn bound to localhost only, not `0.0.0.0`.
- Include `--no-server-header --no-date-header` in the backend service command.
- Example systemd unit is available at `backend/scripts/grp-backend.service`.
- Verify public traffic reaches the backend only through nginx.

## 4. Upload Data Sync

Do not overwrite live upload folders unless live files are missing. If restore is needed, copy only missing files into:

- `backend/gallery_uploads`
- `backend/news_uploads`
- `backend/unidentified_uploads`
- `backend/complaint_uploads`

## 5. Audit Login Accounts

Create one read-only audit account per role on live, then verify each login can view pages but cannot edit data.

Suggested usernames:

- `audit-admin[at]grp[dot]local`
- `audit-dgp[at]grp[dot]local`
- `audit-srp[at]grp[dot]local`
- `audit-dsrp[at]grp[dot]local`
- `audit-irp[at]grp[dot]local`
- `audit-station[at]grp[dot]local`

After creating them, test a blocked mutation. It should return:

```json
{"detail":"Audit account is read-only. This action cannot modify live data."}
```

## 6. Final Verification

Check these routes after restart:

- `/api/admin/login`
- `/api/admin/credentials`
- `/api/admin/audit-logs`
- `/api/admin/help-requests`
- `/api/latest-news`
- `/api/gallery-items`
- `/api/unidentified-bodies`

Security checks:

- Public `/api/admin/login-options` must be blocked without admin token.
- Admin credential table must show usernames only, not real passwords.
- Help request reply must store reply history.
- Aadhar values in DB must be masked like `XXXXXXXX1234`.
- Login brute-force attempts must return `429` after repeated failures.
- Response headers must not disclose backend/framework versions. Check:

```bash
curl -I https://grp.prismappolice.in/admin-dashboard
curl -I https://grp.prismappolice.in/api/latest-news
```
