# FastAPI Backend Dockerfile - Production Ready
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip FIRST - critical for wheel support
RUN python -m pip install --upgrade --no-cache-dir pip setuptools wheel

# Copy requirements
COPY requirements.txt .

# Install ONLY pre-built wheels (no compilation)
RUN pip install --no-cache-dir --only-binary :all: -r requirements.txt || \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

ENV PYTHONUNBUFFERED=1

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')" || exit 1

EXPOSE 8000

# Run with gunicorn in production
CMD ["gunicorn", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", \
     "--timeout", "120", "--bind", "0.0.0.0:8000", "fastapi_server:app"]
