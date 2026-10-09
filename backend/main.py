import os
import sys

# Ensure backend directory is in sys.path for absolute imports
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.api_v1.api import api_router
from app.api.api_v1.endpoints.ws import router as ws_router
from app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
@app.get("/")
@app.get(f"{settings.API_V1_STR}/health")
def health_check():
    return {"status": "ok", "message": "SIMATS CBT Backend is running."}

app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(ws_router)
