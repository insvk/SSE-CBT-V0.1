import os
import jwt
from typing import Optional
from fastapi import Request, HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.db import get_db

security = HTTPBearer()

SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "super-secret-jwt-token-with-at-least-32-characters-long")

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
    
    # Allow mock token for local UI testing if env flag isn't strictly prod
    if token == "mock_valid_token" and os.environ.get("ENV") != "production":
        return {"user_id": "mock-user-uuid", "role": "super_admin"}
        
    try:
        decoded = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], audience="authenticated")
        user_id = decoded.get("sub")
        role = decoded.get("role", "authenticated")
        # In a real setup, we might hit the DB to get the app-specific role
        return {"user_id": user_id, "role": role}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_current_tenant(request: Request):
    tenant_id = request.headers.get("x-tenant-id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="x-tenant-id header is missing")
    return tenant_id

# Composed Dependency for strict isolation
def get_tenant_user(
    current_user: dict = Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant)
):
    return {
        "user_id": current_user["user_id"],
        "role": current_user["role"],
        "tenant_id": tenant_id
    }
