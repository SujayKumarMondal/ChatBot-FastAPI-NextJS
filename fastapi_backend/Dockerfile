# FastAPI Backend Dockerfile - Production Ready
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip, setuptools, wheel FIRST
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies with pre-built wheels where possible
RUN pip install --no-cache-dir -r requirements.txt || pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Run migrations on startup
ENV PYTHONUNBUFFERED=1

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')" || exit 1

# Expose port
EXPOSE 8000

# Run with gunicorn in production
CMD ["gunicorn", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "--timeout", "120", "--bind", "0.0.0.0:8000", "fastapi_server:app"]
