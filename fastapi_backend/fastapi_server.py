import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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

# =========================
# Environment-based configuration
# =========================
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
DEBUG = ENVIRONMENT == "development"

# Get allowed origins from environment or use defaults
if ENVIRONMENT == "production":
    # Production: use only specified domains
    ALLOWED_ORIGINS = os.getenv(
        "ALLOWED_ORIGINS",
        "https://chatpaat.render.com"
    ).split(",")
else:
    # Development: allow localhost variants
    ALLOWED_ORIGINS = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:7004",
        "http://localhost:7004",
    ]

# CORS middleware - secure configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    max_age=3600,
)

# Include API routes
app.include_router(router)


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
