# ChatPaat Deployment Troubleshooting Guide

## 🔴 Backend Issues

### Issue: `ModuleNotFoundError: No module named 'fastapi_server'`

**Cause**: Build command doesn't navigate to backend directory

**Solution**:
```
Render Build Command WRONG: pip install -r requirements.txt
Render Build Command RIGHT: cd fastapi_backend && pip install -r requirements.txt
```

**Fix in Render**:
1. Go to Service → Settings
2. Edit Build Command to: `cd fastapi_backend && pip install -r requirements.txt && alembic upgrade head`
3. Save and redeploy

---

### Issue: `failed to authenticate backend`

**Cause**: Database credentials are incorrect

**Solution**: Verify Supabase credentials:
```bash
# In Supabase dashboard:
Project Settings → Database
- Copy exact: Host, User, Password, Port

# In Render environment variables:
DB_HOST=db.xxxxx.supabase.co
DB_USER=postgres
DB_PASSWORD=your_exact_password_with_special_chars
DB_PORT=5432
DB_NAME=postgres
```

**Debug**:
```bash
# In Render Shell:
psql -h db.xxxxx.supabase.co -U postgres -d postgres -c "SELECT version();"
# Enter password when prompted
```

---

### Issue: Alembic migration fails with `DependentObjectsStillExist`

**Cause**: Foreign key constraints prevent table drop

**Solution** (Already fixed in your code):
- Migration is reordered to drop dependent tables first
- If issue persists, check migration file: `fastapi_backend/alembic/versions/`

**Manual fix**:
```bash
# In Render Shell:
cd fastapi_backend
alembic current              # Check current state
alembic downgrade base       # ⚠️ WARNING: Deletes all data
alembic upgrade head         # Recreate all tables
alembic stamp head           # Mark as complete
```

---

### Issue: `Port 10000 is already in use`

**Cause**: Multiple Render instances or port conflict

**Solution**:
1. Go to Service → Settings
2. Don't hardcode port in Start Command
3. Start Command should be:
```
cd fastapi_backend && gunicorn -w 4 -k uvicorn.workers.UvicornWorker fastapi_server:app
```
4. PORT environment variable is automatically set by Render

---

### Issue: Health check fails immediately

**Cause**: 
- Pod using up too much memory
- Database not accessible
- Startup takes too long

**Solution**:
1. Render → Service → Settings
2. Health Check → increase "Initial Delay" to 60 seconds
3. Check logs for actual errors

---

### Issue: CORS error: Origin not allowed

**Browser Console Error**:
```
Access to XMLHttpRequest at 'https://api.example.com' from origin 'https://web.example.com' 
has been blocked by CORS policy
```

**Cause**: Frontend URL not in `ALLOWED_ORIGINS`

**Fix**: 
1. Get exact frontend URL from Render (e.g., `https://chatpaat-web.render.com`)
2. In fastapi_server.py environment variables, set:
```
ALLOWED_ORIGINS=https://chatpaat-web.render.com
```
3. Redeploy backend

---

## 🟡 Frontend Issues

### Issue: Build fails with `VITE_API_URL is not defined`

**Cause**: Environment variable not passed to build

**Solution**:
1. Render → Environment → Add:
```
VITE_API_URL=https://your-api.render.com
```
2. Rebuild (Render automatically picks up env vars)

**Alternative**: Set in `frontend/.env.production`
```
VITE_API_URL=https://your-api.render.com
```

---

### Issue: Frontend loads but API calls fail with `net::ERR_NAME_NOT_RESOLVED`

**Cause**: `VITE_API_URL` doesn't resolve

**Debug**:
1. Open browser DevTools → Network
2. Check API requests - what URL are they going to?
3. Try curl: `curl https://your-api.render.com/health`
4. Should return: `{"status": "healthy", ...}`

**Solution**:
- Verify exact URL from Render dashboard
- No trailing slash: `https://api.render.com` NOT `https://api.render.com/`
- Wait for backend to fully deploy (might take 2-3 mins)

---

### Issue: Frontend shows blank page

**Cause**: Build failed silently or wrong dist directory

**Solution**:
1. Render → Logs → check Build logs
2. Look for: `npm run build` output
3. Verify Publish Directory: `frontend/dist` (if using subdirectory)

**Check dist folder locally**:
```bash
cd frontend
npm install
npm run build
ls -la dist/         # Should have index.html, .js files
```

---

### Issue: Static assets (CSS, images) return 404

**Cause**: Base path not configured correctly

**Solution** (for `frontend/dist`):
1. In vite.config.ts, add base path:
```js
export default defineConfig({
  base: '/',  // Render serves from root
  // ... rest of config
})
```
2. Rebuild: `npm run build`
3. Verify `dist/index.html` exists

---

## 🔴 Database Issues

### Issue: `could not connect to server: No such file or directory`

**Cause**: Database is down or wrong hostname

**Solution**:
```bash
# Test connection locally (with Supabase credentials):
psql -h db.xxxxx.supabase.co -U postgres -d postgres

# If stuck, check Supabase:
1. Go to supabase.com
2. Project → Database → check if green (running)
3. Project → Settings → Database → verify credentials
```

---

### Issue: `fatal: SCRAM authentication failed`

**Cause**: Password contains special characters not URL-encoded

**Solution**: In environment variables, use raw password:
```
DB_PASSWORD=your-password-with-@#$%
```
(Database connection code will handle encoding)

**Verify in `fastapi_backend/db.py`**:
- Should have: `encoded_password = quote(DB_PASSWORD, safe="")`
- This handles special characters

---

### Issue: `database "chatpaat" does not exist`

**Cause**: Wrong database name or not created in Supabase

**Solution**:
1. Supabase dashboard → SQL Editor
2. Run:
```sql
CREATE DATABASE IF NOT EXISTS chatpaat;
-- Or use default: postgres
```
3. Update `DB_NAME` environment variable to match

---

### Issue: `schema "refdata" does not exist`

**Cause**: DB_SCHEMA doesn't match existing schema

**Solution**:
1. Default schema is `public` (correct for Supabase)
2. In environment variables:
```
DB_SCHEMA=public
```
3. DO NOT use custom schema on Supabase free tier

---

### Issue: Alembic migration takes very long or times out

**Cause**: Large table modifications or slow database

**Solution**:
1. Increase timeout in Render:
   - Service → Settings
   - Build timeout: 60 minutes
   - Start timeout: 60 seconds

2. Or run migrations manually:
```bash
# In Render Shell:
cd fastapi_backend
alembic upgrade head --sql > migration.sql  # Generate SQL
# Review migration.sql
alembic upgrade head  # Apply
```

---

## 🟢 Monitoring & Verification

### Test Backend Health

```bash
# Should return 200
curl -I https://your-api.render.com/health

# Full response
curl https://your-api.render.com/health
# Expected: {"status": "healthy", "version": "1.0.0", "environment": "production"}
```

### Test API Connectivity

```bash
# From frontend console:
fetch('https://your-api.render.com/health')
  .then(r => r.json())
  .then(console.log)
```

### Check Logs

**Backend Logs**:
1. Render → chatpaat-api → Logs
2. Search for:
   - `INFO  [alembic.runtime.migration]` - Migration status
   - `INFO  [DATABASE]` - Connection info
   - `INFO  [connection pool]` - Pool status

**Frontend Logs**:
1. Browser DevTools → Console
2. Application → Network (check API calls)
3. Check CORS headers

---

## 🛠️ Emergency Recovery

### Reset Everything (⚠️ DELETES DATA)

```bash
# In Render Shell for backend:
cd fastapi_backend

# 1. Drop all tables
alembic downgrade base

# 2. Recreate from models
python -c "from models import Base; from db import engine; Base.metadata.create_all(engine)"

# 3. Mark migration complete
alembic stamp head

# 4. Check status
alembic current
```

### Rollback Deployment

**Keep previous versions**:
1. Render keeps last 5 deployments
2. Service → Deployments → select old version
3. Click "Deploy"

### Restore Database Backup

**Supabase**:
1. Project → Backups
2. See available backups
3. Request restore (contact support for point-in-time)

---

## 📞 Quick Reference

| Issue | First Check |
|-------|------------|
| Backend won't start | Render Logs → Build step completed? |
| API returns 503 | `curl /health` - is backend up? |
| Frontend blank | Browser DevTools → Console for errors |
| CORS error | Check ALLOWED_ORIGINS in backend env |
| Database error | Verify credentials in Render env vars |
| Migration failed | Check Render Shell → alembic current |

---

## 🆘 If Still Stuck

1. **Check Logs First**
   - Render → Service → Logs
   - Search for actual error messages

2. **Test Locally**
   ```bash
   docker-compose up
   # If works locally, issue is production config
   ```

3. **Verify Environment Variables**
   ```bash
   # In Render Shell:
   printenv | grep -E "DB_|ENVIRONMENT|ALLOWED"
   ```

4. **Read Documentation**
   - `DEPLOYMENT.md` - Full guide
   - `PRODUCTION_CHECKLIST.md` - Verification
   - Official docs: render.com/docs, supabase.com/docs

5. **Ask for Help With**
   - Exact error message from logs
   - What you're trying to do
   - What you already tried
