release: cd fastapi_backend && \
  python -m pip install --upgrade pip && \
  pip install --only-binary :all: -r requirements.txt && \
  alembic upgrade head
web: cd fastapi_backend && \
  gunicorn -w 4 -k uvicorn.workers.UvicornWorker \
  --timeout 120 \
  --bind 0.0.0.0:${PORT:-10000} \
  fastapi_server:app