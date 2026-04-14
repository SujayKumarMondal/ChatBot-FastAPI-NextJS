import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
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

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:7004",
        "http://localhost:7004",
        "http://localhost",
        "http://127.0.0.1",
        "*"  # Fallback for development
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    max_age=3600,
)

# Include API routes
app.include_router(router)



if __name__ == "__main__":
    import uvicorn
    
    # Always run on localhost:7004
    HOST = "127.0.0.1"
    PORT = 7004
    
    uvicorn.run(
        "fastapi_server:app",
        host=HOST,
        port=PORT,
        reload=False,
        log_level="info"
    )
