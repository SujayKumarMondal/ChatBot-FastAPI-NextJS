import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from db import init_db
from routes import router

# Load environment variables
load_dotenv()

# Initialize database
# init_db()

# Create FastAPI app
app = FastAPI(title="ChatPaat API", version="1.0.0")

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
