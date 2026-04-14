# ChatPaat Deployment Guide - Render + Supabase

## 📋 Deployment Architecture

```
Frontend (Next.js/Vite)
  ↓ (HTTPS)
Render Web Service (Frontend)
  ↓
Render Web Service (Backend/FastAPI)
  ↓ (PostgreSQL Connection)
Supabase PostgreSQL Database
```

## 🚀 Quick Start - 5 Steps to Production

### Step 1: Prepare Supabase PostgreSQL Database

**1.1. Create Supabase Project**
- Go to [supabase.com](https://supabase.com)
- Sign up/login
- Create new project: Name it `chatpaat`
- Save credentials:
  - Project URL: `https://xxxxx.supabase.co`
  - Database Password: (saved during creation)
  - Region: Choose closest region

**1.2. Get Database Credentials**
```
Go to Project Settings → Database
- Host: db.xxxxx.supabase.co
- Port: 5432
- Database: postgres
- User: postgres
- Password: (your password)
```

**1.3. Create Database Schema (Optional)**
```sql
-- In Supabase SQL Editor, run:
CREATE SCHEMA IF NOT EXISTS public;
-- Tables will be created by Alembic migrations
```

### Step 2: Deploy Backend to Render

**2.1. Prepare Backend**

Ensure backend directory structure:
```
fastapi_backend/
├── fastapi_server.py ✓
├── routes.py ✓
├── models.py ✓
├── db.py ✓
├── auth.py
├── requirements.txt ✓
├── alembic/
│   ├── env.py ✓
│   ├── alembic.ini ✓
│   └── versions/
└── .env (local only)
```

**2.2. Create Render Service**
1. Go to [render.com](https://render.com)
2. Login/Sign up
3. Click "New +" → "Web Service"
4. Connect GitHub repository
5. Configure:
   - **Name:** chatpaat-api
   - **Environment:** Python 3
   - **Region:** Choose based on latency
   - **Branch:** main
   - **Build Command:** 
     ```
     cd fastapi_backend && pip install -r requirements.txt && alembic upgrade head
     ```
   - **Start Command:** 
     ```
     cd fastapi_backend && gunicorn -w 4 -k uvicorn.workers.UvicornWorker fastapi_server:app
     ```

**2.3. Set Environment Variables**

In Render dashboard → Service → Environment:

```ini
ENVIRONMENT=production
DEBUG=false
USE_POSTGRES=true

# Database (from Supabase)
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=<your_supabase_password>
DB_HOST=db.xxxxx.supabase.co
DB_PORT=5432
DB_SCHEMA=public

# Application
HOST=0.0.0.0
PORT=10000
ALLOWED_ORIGINS=https://chatpaat-web.render.com

# Auth & Security
SECRET_KEY=<generate with: python -c "import secrets; print(secrets.token_hex(32))">
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Google OAuth (if using social login)
GOOGLE_CLIENT_ID=<your_id>
GOOGLE_CLIENT_SECRET=<your_secret>
FRONTEND_URL=https://chatpaat-web.render.com

# APIs
GROQ_API_KEY=<your_groq_key>
GROQ_API_URL=https://api.groq.com/openai/v1/chat/completions
SENDGRID_API_KEY=<your_sendgrid_key>
SENDGRID_FROM_EMAIL=noreply@chatpaat.com
```

**2.4. Health Check Configuration**

In Render dashboard → Service → Health Check:
- Health Check Path: `/health`
- Initial Delay: 60 seconds
- Period: 300 seconds

**2.5. Deploy**
- Click "Deploy"
- Wait for build to complete
- Check logs for migration status
- Verify `/health` endpoint returns: `{"status": "healthy", ...}`

### Step 3: Deploy Frontend to Render

**3.1. Prepare Frontend**

Create `frontend/.env.production`:
```
VITE_API_URL=https://chatpaat-api.render.com
```

**3.2. Create Render Service for Frontend**

1. In Render → "New +" → "Static Site" (if front-end only) or "Web Service" for Node
2. Configure:
   - **Name:** chatpaat-web
   - **Environment:** Node
   - **Branch:** main
   - **Build Command:** 
     ```
     npm install && npm run build
     ```
   - **Start Command:**
     ```
     npm run preview
     ```
   - **Publish Directory:** `frontend/dist`

**3.3. Set Frontend Environment Variables**

In Render dashboard:
```
VITE_API_URL=https://chatpaat-api.render.com
```

**3.4. Deploy**
- Click "Deploy"
- Wait for build to complete
- Access frontend at provided URL

### Step 4: Build Release Trigger & Migrations

**4.1. Verify Migrations Ran**

Check Render logs:
```
[Backend Logs] → Look for:
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Running upgrade ... (initial migration)
```

**4.2. Manual Migration (if needed)**

In Render Shell for backend service:
```bash
cd fastapi_backend
alembic current              # Check current version
alembic upgrade head         # Run migrations
alembic history --verbose    # See migration history
```

### Step 5: Connect Frontend to Backend & Test

**5.1. Update Frontend API URL**

Vite frontend will use `VITE_API_URL` from environment:
- In development: `http://localhost:7004`
- In production: `https://chatpaat-api.render.com`

**5.2. Test API Connectivity**

```bash
# From frontend console
curl https://chatpaat-api.render.com/health

# Should return:
# {"status": "healthy", "version": "1.0.0", "environment": "production"}
```

**5.3. Test Features**
- Login/Register
- Chat creation
- Message sending
- Search functionality

---

## 🔧 Troubleshooting

### Backend Won't Start

**Error: "No module named 'fastapi_server'"**
- Check Render build command uses correct path: `cd fastapi_backend`
- Verify requirements.txt installed

**Error: "PostgreSQL connection refused"**
- Verify Supabase credentials in environment variables
- Check `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`

**Error: "Alembic migration failed"**
```bash
# Check migration status
alembic current

# Reset migrations (⚠️ CAUTION - deletes data)
alembic downgrade base
alembic upgrade head

# Or skip migrations and recreate tables
# Then run: alembic stamp head
```

### Frontend Can't Reach Backend

**Symptom: Login/Chat fails, network errors in console**

1. Check `ALLOWED_ORIGINS` in backend includes frontend URL
2. Verify `VITE_API_URL` is correct in frontend build
3. Test: `curl https://chatpaat-api.render.com/health`
4. Check browser console for CORS errors

### Database Connection Slow

1. Check Supabase region matches Render region
2. Enable connection pooling: Add to DB_HOST query
3. Monitor Supabase dashboard → Statistics

---

## 📊 Environment Variables Checklist

- [ ] `ENVIRONMENT=production`
- [ ] `DEBUG=false`
- [ ] `USE_POSTGRES=true`
- [ ] `DB_HOST=db.xxxxx.supabase.co`
- [ ] `DB_USER=postgres`
- [ ] `DB_PASSWORD=<secure>`
- [ ] `DB_NAME=postgres`
- [ ] `SECRET_KEY=<secure>`
- [ ] `ALLOWED_ORIGINS=https://your-frontend-url.render.com`
- [ ] `GOOGLE_CLIENT_ID` (if using OAuth)
- [ ] `GROQ_API_KEY` (if using AI features)

---

## 🔐 Security Checklist

- [ ] No hardcoded secrets in code
- [ ] All sensitive values in Render environment dashboard
- [ ] CORS `ALLOWED_ORIGINS` restricted to your domain
- [ ] `DEBUG=false` in production
- [ ] PostgreSQL password is strong (Supabase-generated)
- [ ] `SECRET_KEY` is unique and strong
- [ ] HTTPS enforced (Render provides free SSL)

---

## 📈 Performance Tips

1. **Database**
   - Use Supabase connection pooling (PgBouncer)
   - Monitor query performance in Supabase dashboard

2. **Backend**
   - gunicorn workers: 4 (adjust based on instance size)
   - uvicorn workers per process: automatic

3. **Frontend**
   - Render caches static assets
   - Check Network tab for slow endpoints

---

## 🚨 Emergency Rollback

If deployment breaks:

**Backend:**
```bash
# In Render dashboard
1. Roll out old version (if available)
2. Or trigger new deploy from different branch
3. Check logs: Service → Logs
```

**Database:**
```sql
-- Supabase console
-- Backups available in Project Settings
-- Can restore point-in-time backup
```

---

## ✅ Post-Deployment Verification

1. **Check Backend Health**
   ```bash
   curl -I https://chatpaat-api.render.com/health
   # Should return: HTTP/2 200
   ```

2. **Check Frontend Loads**
   - Open https://chatpaat-web.render.com in browser
   - Check browser console for errors

3. **Test Authentication**
   - Register new account
   - Login
   - Create chat

4. **Monitor Logs**
   - Backend: Render → Service → Logs
   - Database: Supabase → Statistics

---

## 📞 Support Resources

- **Render Docs:** https://render.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **FastAPI Docs:** https://fastapi.tiangolo.com
- **Alembic Docs:** https://alembic.sqlalchemy.org

---

## 🎯 Next Steps

1. Monitor application for first 24 hours
2. Set up error tracking (Sentry, etc.)
3. Configure automated backups
4. Set up monitoring alerts
5. Plan for scaling (if needed)
