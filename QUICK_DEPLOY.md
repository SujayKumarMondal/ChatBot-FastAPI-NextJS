# ChatPaat Quick Deployment Reference

## 🚀 Deploy in 5 Minutes

### Prerequisites
- Supabase account (free tier)
- Render account (free tier)
- GitHub repository

### Step 1: Set Up Supabase (2 min)

**1.1 Create Supabase Project**
```
Go to supabase.com → Create Project → chatpaat
Save these credentials:
```

**1.2 Copy Credentials**
```
Dashboard → Settings → Database
- Host: db.xxxxx.supabase.co
- User: postgres  
- Password: xxxxxxxx
- Port: 5432
```

### Step 2: Deploy Backend (2 min)

**2.1 Create Render Service**
```
render.com → New → Web Service
- Connect GitHub repo
- Name: chatpaat-api
- Build: cd fastapi_backend && pip install -r requirements.txt && alembic upgrade head
- Start: cd fastapi_backend && gunicorn -w 4 -k uvicorn.workers.UvicornWorker fastapi_server:app
```

**2.2 Add Environment Variables**
```
ENVIRONMENT=production
DEBUG=false
USE_POSTGRES=true
DB_HOST=db.xxxxx.supabase.co
DB_USER=postgres
DB_PASSWORD=<paste from Supabase>
DB_NAME=postgres
DB_PORT=5432
DB_SCHEMA=public
SECRET_KEY=<run: python -c "import secrets; print(secrets.token_hex(32))">
ALLOWED_ORIGINS=https://chatpaat-web.render.com
```

**2.3 Deploy**
```
Click "Deploy" → Wait for build
Test: curl https://chatpaat-api.render.com/health
Expected: {"status": "healthy", ...}
```

### Step 3: Deploy Frontend (1 min)

**3.1 Create Render Service**
```
render.com → New → Web Service
- Name: chatpaat-web
- Build: npm install && npm run build
- Start Path: frontend
- Publish Dir: frontend/dist
```

**3.2 Add Environment Variables**
```
VITE_API_URL=https://chatpaat-api.render.com
```

**3.3 Deploy**
```
Click "Deploy" → Wait for build → Done!
```

---

## 🔧 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Backend won't start | Check `cd fastapi_backend` in build command |
| Migration fails | Verify DB credentials + Supabase is running |
| Frontend can't reach API | Check `ALLOWED_ORIGINS` includes frontend URL |
| CORS errors | Backend: add frontend URL to `ALLOWED_ORIGINS` |
| Database connection refused | Verify Supabase password is correct |

---

## 📋 Environment Variables Checklist

- [ ] `ENVIRONMENT=production`
- [ ] `DB_HOST=db.xxxxx.supabase.co`
- [ ] `DB_USER=postgres`
- [ ] `DB_PASSWORD=<secure>`
- [ ] `SECRET_KEY=<unique>`
- [ ] `ALLOWED_ORIGINS=https://your-frontend.render.com`
- [ ] `VITE_API_URL=https://your-backend.render.com`

---

## ✅ Verify Deployment

```bash
# Test backend health
curl https://your-api.render.com/health

# Expected response:
{"status": "healthy", "version": "1.0.0", "environment": "production"}

# Test frontend loads
Open https://your-web.render.com in browser
Check browser console for errors
Try login/register
```

---

## 📖 Full Documentation

See `DEPLOYMENT.md` for complete guide with explanations.

---

## 🆘 Need Help?

1. Check Render logs: Service → Logs
2. Check Supabase dashboard: Project → Statistics
3. See `DEPLOYMENT.md` troubleshooting section
4. Check browser console for frontend errors
