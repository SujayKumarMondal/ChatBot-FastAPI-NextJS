#!/bin/bash
# Build script for Render deployment
# Properly installs dependencies avoiding compilation issues

set -e

echo "🔨 Building ChatPaat Backend..."

# Navigate to backend
cd fastapi_backend

echo "📦 Installing Python dependencies..."

# Upgrade pip, setuptools, wheel first
pip install --upgrade --no-cache-dir pip setuptools wheel

# Install requirements with pre-built wheels only
pip install --no-cache-dir \
    --only-binary :all: \
    -r requirements.txt 2>&1 || \
pip install --no-cache-dir \
    -r requirements.txt

echo "🗄️ Running database migrations..."

# Run alembic migrations
alembic upgrade head

echo "✅ Build complete!"
