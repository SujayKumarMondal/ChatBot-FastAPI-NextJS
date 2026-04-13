release: cd fastapi_backend && alembic upgrade head
web: cd fastapi_backend && gunicorn -w 4 -k uvicorn.workers.UvicornWorker --timeout 120 --bind 0.0.0.0:${PORT:-10000} fastapi_server:app