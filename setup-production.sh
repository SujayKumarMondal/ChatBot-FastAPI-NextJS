#!/bin/bash
# ChatPaat Production Setup Script
# Run this to set up production-ready environment locally

set -e

echo "🚀 ChatPaat Production Setup"
echo "=============================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Generate SECRET_KEY
echo -e "\n${BLUE}1. Generating SECRET_KEY...${NC}"
SECRET_KEY=$(python -c "import secrets; print(secrets.token_hex(32))")
echo -e "${GREEN}✓ Generated: ${SECRET_KEY:0:16}...${NC}"

# 2. Check requirements.txt
echo -e "\n${BLUE}2. Checking FastAPI backend...${NC}"
if [ ! -f "fastapi_backend/requirements.txt" ]; then
    echo -e "${YELLOW}⚠ requirements.txt not found${NC}"
else
    echo -e "${GREEN}✓ requirements.txt found${NC}"
fi

# 3. Check Procfile
echo -e "\n${BLUE}3. Checking Procfile...${NC}"
if [ ! -f "Procfile" ]; then
    echo -e "${YELLOW}⚠ Procfile not found${NC}"
else
    echo -e "${GREEN}✓ Procfile configured${NC}"
fi

# 4. Check models
echo -e "\n${BLUE}4. Checking database models...${NC}"
if [ ! -f "fastapi_backend/models.py" ]; then
    echo -e "${YELLOW}⚠ models.py not found${NC}"
else
    echo -e "${GREEN}✓ models.py found${NC}"
fi

# 5. Check migrations
echo -e "\n${BLUE}5. Checking Alembic migrations...${NC}"
if [ ! -f "fastapi_backend/alembic/env.py" ]; then
    echo -e "${YELLOW}⚠ alembic/env.py not found${NC}"
else
    echo -e "${GREEN}✓ Alembic configured${NC}"
fi

# 6. Create environment file template
echo -e "\n${BLUE}6. Creating deployment configuration...${NC}"
if [ ! -f ".env.render" ]; then
    echo -e "${YELLOW}ℹ Create .env.render from template${NC}"
else
    echo -e "${GREEN}✓ .env.render exists${NC}"
fi

# 7. Display SECRET_KEY
echo -e "\n${BLUE}7. Your Generated SECRET_KEY:${NC}"
echo -e "${GREEN}${SECRET_KEY}${NC}"

# 8. Next steps
echo -e "\n${BLUE}📋 Next Steps:${NC}"
echo -e "1. Read: DEPLOYMENT.md"
echo -e "2. Create Supabase project at supabase.com"
echo -e "3. Update .env.render with Supabase credentials"
echo -e "4. Add SECRET_KEY above to Render environment variables"
echo -e "5. Deploy to Render"

echo -e "\n${GREEN}✓ Setup complete!${NC}"
