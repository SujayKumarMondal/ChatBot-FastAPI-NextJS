import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

from db import init_db
from routes import router

# Load environment variables
load_dotenv()

# Initialize database
# init_db()

# Create FastAPI app
app = FastAPI(title="ChatPaat API", version="1.0.0")

# Custom OpenAPI schema with Bearer token security
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title="ChatPaat API",
        version="1.0.0",
        description="ChatPaat API Endpoints",
        routes=app.routes,
    )
    openapi_schema["components"]["securitySchemes"] = {
        "Bearer": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "Enter JWT token (get from /api/login/ endpoint)"
        }
    }
    
    # Add security requirement to all endpoints except login/register/oauth
    public_endpoints = ["/api/login/", "/api/register/", "/api/auth/google/exchange/", "/api/refresh-token/"]
    
    for path, path_item in openapi_schema.get("paths", {}).items():
        for operation in path_item.values():
            if isinstance(operation, dict) and "operationId" in operation:
                # Add security to all non-public endpoints
                if not any(path.startswith(pub) for pub in public_endpoints):
                    operation["security"] = [{"Bearer": []}]
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

# =========================
# Environment-based configuration
# =========================
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
DEBUG = ENVIRONMENT == "development"

def parse_origins(raw_value: str | None, fallback: list[str] | None = None) -> list[str]:
    if not raw_value:
        return fallback or []

    cleaned = raw_value.strip()
    if cleaned.startswith("[") and cleaned.endswith("]"):
        cleaned = cleaned[1:-1]

    origins = []
    for item in cleaned.replace("\n", " ").split(","):
        origin = item.strip().strip('"').strip("'")
        if origin:
            origins.append(origin)

    if fallback:
        for origin in fallback:
            if origin not in origins:
                origins.append(origin)

    return origins


# Get allowed origins from environment or use defaults
DEFAULT_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:7004",
    "http://localhost:7004",
    "https://chatpaat.netlify.app",
    "https://chatbot-fastapi-nextjs.onrender.com",
]

frontend_origin = os.getenv("FRONTEND_URL", "").strip()
production_defaults = [
    "https://chatpaat.netlify.app",
    "https://chatpaat.vercel.app",
    "https://chatbot-fastapi-nextjs.onrender.com",
]
if frontend_origin:
    production_defaults.insert(0, frontend_origin)

if ENVIRONMENT == "production":
    ALLOWED_ORIGINS = parse_origins(
        os.getenv("ALLOWED_ORIGINS") or os.getenv("CORS_ORIGINS"),
        production_defaults,
    )
else:
    ALLOWED_ORIGINS = parse_origins(os.getenv("CORS_ORIGINS"), DEFAULT_ORIGINS)

# CORS middleware - secure configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://[a-zA-Z0-9-]+\.netlify\.app",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    max_age=3600,
)

# Include API routes
app.include_router(router)


@app.on_event("startup")
async def startup_event():
    init_db()


# =========================
# Health check endpoint
# =========================
@app.get("/health")
async def health_check():
    """Health check endpoint for deployment monitoring."""
    return JSONResponse(
        status_code=200,
        content={
            "status": "healthy",
            "version": "1.0.0",
            "environment": ENVIRONMENT
        }
    )


@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "ChatPaat API", "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn
    
    # Development settings
    HOST = os.getenv("HOST", "127.0.0.1")
    PORT = int(os.getenv("PORT", "7004"))
    
    uvicorn.run(
        "fastapi_server:app",
        host=HOST,
        port=PORT,
        reload=DEBUG,
        log_level="info" if DEBUG else "warning"
    )
