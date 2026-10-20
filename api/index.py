import os
import sys

# Ensure current api directory and backend directory are in sys.path
api_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(api_dir)
backend_dir = os.path.join(root_dir, "backend")

for p in [api_dir, backend_dir, root_dir]:
    if os.path.exists(p) and p not in sys.path:
        sys.path.insert(0, p)

try:
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
    @app.get("/api/health")
    @app.get("/v1/health")
    @app.get(f"{settings.API_V1_STR}/health")
    def health_check():
        return {"status": "ok", "message": "SSE CBT Platform Backend is running."}

    # Multi-prefix router mount for zero-failure cloud deployment (Vercel serverless + local + direct proxy)
    app.include_router(api_router, prefix=settings.API_V1_STR)  # /api/v1
    app.include_router(api_router, prefix="/v1")               # /v1
    app.include_router(api_router)                             # /
    app.include_router(ws_router)

except Exception as e:
    import logging
    logging.exception("Failed to initialize main app in api/index.py: %s", e)
    # The `as e` binding is cleared once the except block exits, so capture the
    # message now for the deferred fallback handlers to reference later.
    init_error = str(e)
    from fastapi import FastAPI
    app = FastAPI(title="SSE CBT Platform Fallback")

    @app.get("/health")
    @app.get("/")
    @app.get("/api/health")
    def fallback_health():
        return {"status": "error", "message": f"Server initialization error: {init_error}"}

    @app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"])
    def fallback_any(full_path: str):
        return {"error": "Server initialization error", "detail": init_error, "path": full_path}

# Authoritative top-level exports for Vercel discovery
application = app
handler = app
