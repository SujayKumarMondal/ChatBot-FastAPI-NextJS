# ChatPaat: Deployment & Environment Configuration

## 🚀 Deployment Overview

This document provides comprehensive guidance for deploying ChatPaat to development, staging, and production environments.

---

## 💻 Development Environment Setup

### **Prerequisites**

- Python 3.8+
- Node.js 16+ with npm
- Git
- SQLite 3 (pre-installed on most systems)

### **Backend Setup**

```bash
# Clone repository
git clone <repo-url>
cd ChatPaat/fastapi_backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Edit .env with your credentials
# (Groq API key, Google OAuth credentials, etc.)

# Initialize database
python -c "from db import init_db; init_db()"

# Run development server
python fastapi_server.py
# Server runs on http://127.0.0.1:7004
```

### **Frontend Setup**

```bash
cd ../frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Development server
npm run dev
# App runs on http://localhost:5173
```

### **Development Environment Variables**

**Backend (`fastapi_backend/.env`)**:
```env
# JWT
JWT_SECRET_KEY=dev-secret-key-minimum-32-characters-long
JWT_ALGORITHM=HS256
JWT_EXPIRE_HOURS=24

# Groq API
GROQ_API_KEY=gsk_<your-test-key>
GROQ_API_URL=https://api.groq.com/openai/v1/chat/completions

# Google OAuth (Get from Google Cloud Console)
GOOGLE_CLIENT_ID=<your-dev-client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<your-dev-client-secret>
FRONTEND_URL=http://localhost:5173

# SendGrid (for password resets)
SENDGRID_API_KEY=SG.<your-test-key>
SENDER_EMAIL=dev@example.com

# Database (SQLite for dev)
USE_POSTGRES=false
```

**Frontend (`.env.local`)**:
```env
VITE_API_URL=http://127.0.0.1:7004
```

---

## 🐳 Docker Deployment

### **Dockerfile for Backend**

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY fastapi_backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY fastapi_backend/ .

# Set environment
ENV PYTHONUNBUFFERED=1

# Expose port
EXPOSE 7004

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:7004/health/')"

# Run application
CMD ["uvicorn", "fastapi_server:app", "--host", "0.0.0.0", "--port", "7004"]
```

### **Dockerfile for Frontend**

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY frontend/package*.json ./

RUN npm ci

COPY frontend/ .

# Build for production
RUN npm run build

# Runtime stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### **docker-compose.yml**

```yaml
version: '3.8'

services:
  postgresql:
    image: postgres:15-alpine
    container_name: chatpaat-db
    environment:
      POSTGRES_USER: chatpaat_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: chatpaat_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U chatpaat_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    container_name: chatpaat-api
    environment:
      USE_POSTGRES: "true"
      DB_NAME: chatpaat_db
      DB_USER: chatpaat_user
      DB_PASSWORD: ${DB_PASSWORD}
      DB_HOST: postgresql
      DB_PORT: 5432
      JWT_SECRET_KEY: ${JWT_SECRET_KEY}
      GROQ_API_KEY: ${GROQ_API_KEY}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
      SENDGRID_API_KEY: ${SENDGRID_API_KEY}
    ports:
      - "7004:7004"
    depends_on:
      postgresql:
        condition: service_healthy
    volumes:
      - ./fastapi_backend:/app

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    container_name: chatpaat-web
    ports:
      - "80:80"
    environment:
      VITE_API_URL: http://localhost:7004
    depends_on:
      - backend

volumes:
  postgres_data:
```

### **Running with Docker**

```bash
# Create .env file with all variables
cp .env.example .env
# Edit .env with your credentials

# Start services
docker-compose up --build

# Access:
# Frontend: http://localhost
# Backend: http://localhost:7004
# Database: localhost:5432

# Stop services
docker-compose down

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

---

## ☁️ Cloud Deployment

### **AWS Deployment**

#### **Architecture**:
```
┌─────────────────────────────────────────┐
│             CloudFront (CDN)            │
├─────────────────────────────────────────┤
│         Route 53 (DNS Routing)          │
├─────────────────────────────────────────┤
│  ┌──────────────┐    ┌────────────────┐ │
│  │ S3 Static    │    │ ECS Cluster    │ │
│  │ (Frontend)   │    │ (Backend API)  │ │
│  └──────────────┘    └────────────────┘ │
│         ↓                     ↓          │
│  ┌──────────────────────────────────┐   │
│  │   RDS PostgreSQL (Database)      │   │
│  └──────────────────────────────────┘   │
│         ↓                                │
│  ┌──────────────────────────────────┐   │
│  │   Secrets Manager (API Keys)     │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

#### **Step-by-Step Deployment**:

**1. Create RDS PostgreSQL Database**:
```bash
# Using AWS Console or CLI
aws rds create-db-instance \
  --db-instance-identifier chatpaat-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username admin \
  --master-user-password <strong-password> \
  --allocated-storage 20 \
  --storage-type gp3
```

**2. Create ECS Cluster for Backend**:
```bash
# Create cluster
aws ecs create-cluster --cluster-name chatpaat

# Register task definition (from docker-compose)
aws ecs register-task-definition --cli-input-json file://task-definition.json
```

**3. Deploy Frontend to S3 + CloudFront**:
```bash
# Build frontend
npm run build

# Upload to S3
aws s3 sync dist/ s3://chatpaat-frontend/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id <ID> --paths "/*"
```

**4. Configure Route 53**:
```
chatpaat.com
  ├─ api.chatpaat.com → ECS Load Balancer
  └─ www.chatpaat.com → CloudFront → S3
```

---

### **Heroku Deployment**

```bash
# 1. Create Heroku app
heroku create chatpaat-app

# 2. Add PostgreSQL addon
heroku addons:create heroku-postgresql:hobby-dev -a chatpaat-app

# 3. Set environment variables
heroku config:set JWT_SECRET_KEY=<value>
heroku config:set GROQ_API_KEY=<value>
heroku config:set GOOGLE_CLIENT_ID=<value>
heroku config:set GOOGLE_CLIENT_SECRET=<value>

# 4. Deploy backend
git subtree push --prefix fastapi_backend heroku main

# 5. Initialize database
heroku run "python -c 'from db import init_db; init_db()'"

# 6. Deploy frontend to Vercel
cd frontend
vercel deploy --prod
```

---

## 🔧 Environment-Specific Configurations

### **Development**

| Component | Configuration |
|-----------|---|
| Database | SQLite file-based |
| API URL | http://localhost:7004 |
| Frontend URL | http://localhost:5173 |
| CORS | Allow all origins |
| Logging | DEBUG level |
| SSL/TLS | Not required |
| Rate Limiting | Disabled |

### **Staging**

| Component | Configuration |
|-----------|---|
| Database | PostgreSQL (staging instance) |
| API URL | https://api-staging.chatpaat.com |
| Frontend URL | https://staging.chatpaat.com |
| CORS | Allow staging domain only |
| Logging | INFO level |
| SSL/TLS | Required |
| Rate Limiting | Enabled |

### **Production**

| Component | Configuration |
|-----------|---|
| Database | PostgreSQL (production, replicated) |
| API URL | https://api.chatpaat.com |
| Frontend URL | https://www.chatpaat.com |
| CORS | Allow production domain only |
| Logging | WARNING level |
| SSL/TLS | Required (with auto-renewal) |
| Rate Limiting | Enabled with DDoS protection |

---

## 📋 Pre-Deployment Checklist

### **Backend**

- ✅ Install all dependencies: `pip install -r requirements.txt`
- ✅ Run tests: `pytest tests/`
- ✅ Check migrations: Database tables created
- ✅ Set environment variables in `.env`
- ✅ Configure CORS for production domain
- ✅ Enable HTTPS
- ✅ Set up logging
- ✅ Configure database backups
- ✅ Test API endpoints
- ✅ Verify external service connections (Groq, SendGrid)

### **Frontend**

- ✅ Install dependencies: `npm install`
- ✅ Build for production: `npm run build`
- ✅ Test build: `npm run preview`
- ✅ Update API URL in environment config
- ✅ Remove debug logs
- ✅ Test all features
- ✅ Check responsive design
- ✅ Test authentication flows
- ✅ Minify assets
- ✅ Test performance

### **Database**

- ✅ Backup existing data
- ✅ Test migration script
- ✅ Verify indexes exist
- ✅ Check storage capacity
- ✅ Test recovery procedures
- ✅ Configure automatic backups
- ✅ Set up monitoring

### **Monitoring & DevOps**

- ✅ Enable application logging
- ✅ Set up error tracking (Sentry, etc.)
- ✅ Configure uptime monitoring
- ✅ Set up performance monitoring (Datadog, etc.)
- ✅ Configure alerts for failures
- ✅ Enable access logs
- ✅ Set up log aggregation

---

## 🔄 Continuous Deployment Pipeline

### **GitHub Actions Workflow**

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Backend Tests
        run: |
          cd fastapi_backend
          pip install -r requirements.txt
          pytest
      
      - name: Frontend Tests
        run: |
          cd frontend
          npm install
          npm lint
          npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v2
      
      - name: Deploy to AWS
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: |
          # Deploy backend to ECS
          aws ecs update-service --cluster chatpaat --service backend --force-new-deployment
          
          # Deploy frontend to S3
          aws s3 sync frontend/dist/ s3://chatpaat-frontend/ --delete
          
          # Invalidate CloudFront
          aws cloudfront create-invalidation --distribution-id ${{ secrets.CLOUDFRONT_ID }} --paths "/*"
```

---

## 📊 Monitoring & Logging

### **Application Logging**

```python
import logging
from pythonjsonlogger import jsonlogger

# Configure JSON logging for production
logger = logging.getLogger()
logHandler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter()
logHandler.setFormatter(formatter)
logger.addHandler(logHandler)

# Log important events
logger.info("User registered", extra={"user_id": user.id})
logger.warning("Failed login attempt", extra={"email": email})
logger.error("Database error", extra={"table": "users"})
```

### **Performance Monitoring**

```python
# Example: Monitor API response times
import time

@app.middleware("http")
async def add_process_time_header(request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    
    response.headers["X-Process-Time"] = str(process_time)
    
    if process_time > 1:  # Log slow requests
        logger.warning(f"Slow request: {request.url.path} took {process_time}s")
    
    return response
```

### **Error Tracking (Sentry)**

```python
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn="https://<key@sentry.io/project_id>",
    integrations=[FastApiIntegration()],
    traces_sample_rate=0.1,  # Sample 10% of transactions
)
```

---

## 🔐 SSL/TLS Certificate Setup

### **Using Let's Encrypt & Certbot**

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --standalone -d api.chatpaat.com -d chatpaat.com

# Auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Verify
sudo certbot certificates
```

---

## 🆘 Rollback Procedure

```bash
# If deployment fails, rollback to previous version

# Backend
aws ecs update-service \
  --cluster chatpaat \
  --service backend \
  --task-definition chatpaat-backend:previous-revision

# Frontend
aws s3 sync s3://chatpaat-frontend-backup/ s3://chatpaat-frontend/ --delete
aws cloudfront create-invalidation --distribution-id <ID> --paths "/*"
```

---

## 📚 Related Documentation

- **Backend Setup**: See `02_Backend_Documentation.md`
- **Database**: See `04_Database_Documentation.md`
- **Environment Variables**: See `08_Security_and_Authentication.md`

---

**Deployment Documentation Last Updated**: Q1 2026  
**Recommended Cloud**: AWS, Heroku, or DigitalOcean  
**Container**: Docker + Docker Compose ready
