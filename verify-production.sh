#!/bin/bash

# ChatPaat Production Readiness Verification
# This script verifies all production requirements are met

set -e

echo "🔍 ChatPaat Production Readiness Check"
echo "========================================"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

CHECKS_PASSED=0
CHECKS_FAILED=0

# Helper functions
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1 exists"
        ((CHECKS_PASSED++))
    else
        echo -e "${RED}✗${NC} $1 missing"
        ((CHECKS_FAILED++))
    fi
}

check_content() {
    if grep -q "$2" "$1"; then
        echo -e "${GREEN}✓${NC} $1 contains: $2"
        ((CHECKS_PASSED++))
    else
        echo -e "${RED}✗${NC} $1 missing: $2"
        ((CHECKS_FAILED++))
    fi
}

echo -e "\n${BLUE}Backend Files${NC}"
check_file "fastapi_backend/fastapi_server.py"
check_file "fastapi_backend/requirements.txt"
check_file "fastapi_backend/models.py"
check_file "fastapi_backend/db.py"
check_file "fastapi_backend/Dockerfile"
check_file "fastapi_backend/alembic/env.py"

echo -e "\n${BLUE}Frontend Files${NC}"
check_file "frontend/vite.config.ts"
check_file "frontend/package.json"
check_file "frontend/Dockerfile"
check_file "frontend/Dockerfile.dev"

echo -e "\n${BLUE}Configuration Files${NC}"
check_file "Procfile"
check_file "render.yaml"
check_file ".env.render"
check_file "docker-compose.yml"

echo -e "\n${BLUE}Documentation Files${NC}"
check_file "DEPLOYMENT.md"
check_file "PRODUCTION_CHECKLIST.md"
check_file "QUICK_DEPLOY.md"
check_file "SETUP_SUMMARY.md"

echo -e "\n${BLUE}Backend Configuration${NC}"
check_content "fastapi_backend/fastapi_server.py" "@app.get(\"/health\")"
check_content "fastapi_backend/fastapi_server.py" "ENVIRONMENT"
check_content "fastapi_backend/requirements.txt" "gunicorn"
check_content "Procfile" "gunicorn"

echo -e "\n${BLUE}Frontend Configuration${NC}"
check_content "frontend/vite.config.ts" "VITE_API_URL"
check_content "frontend/src/lib/api.ts" "VITE_API_URL"

echo -e "\n${BLUE}Database Configuration${NC}"
check_content "fastapi_backend/db.py" "USE_POSTGRES"
check_content "fastapi_backend/db.py" "DB_SCHEMA"
check_content "fastapi_backend/alembic/env.py" "postgresql"

echo -e "\n${BLUE}Docker Configuration${NC}"
check_content "docker-compose.yml" "postgres"
check_content "docker-compose.yml" "backend"
check_content "docker-compose.yml" "frontend"

# Summary
echo -e "\n${BLUE}Summary${NC}"
echo -e "Passed: ${GREEN}${CHECKS_PASSED}${NC}"
echo -e "Failed: ${RED}${CHECKS_FAILED}${NC}"

if [ $CHECKS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✅ All checks passed! Ready for production.${NC}"
    echo -e "\n${BLUE}Next steps:${NC}"
    echo "1. Review DEPLOYMENT.md"
    echo "2. Create Supabase project"
    echo "3. Deploy to Render"
    exit 0
else
    echo -e "\n${RED}❌ Some checks failed. Review errors above.${NC}"
    exit 1
fi
