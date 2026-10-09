from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from app.core.security import get_tenant_user
import uuid
from datetime import datetime, timezone

router = APIRouter()

class TenantCreate(BaseModel):
    name: str
    domain: str

class TenantResponse(BaseModel):
    id: str
    name: str
    domain: str
    status: str
    candidate_count: int

# Mock Database for local development
MOCK_TENANTS = {
    "tenant-1": {"id": "tenant-1", "name": "SIMATS Engineering", "domain": "simats.edu", "status": "active", "candidate_count": 1250},
    "tenant-2": {"id": "tenant-2", "name": "Global Tech College", "domain": "gtc.edu", "status": "active", "candidate_count": 450}
}

@router.get("/", response_model=List[TenantResponse])
def get_tenants(user_context: dict = Depends(get_tenant_user)):
    # Super Admin check would go here in production
    if user_context["role"] != "super_admin":
        # Return only their tenant
        tid = user_context["tenant_id"]
        if tid in MOCK_TENANTS:
            return [MOCK_TENANTS[tid]]
        return []
    
    return list(MOCK_TENANTS.values())

@router.post("/", response_model=TenantResponse)
def create_tenant(tenant: TenantCreate, user_context: dict = Depends(get_tenant_user)):
    if user_context["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Not authorized to create tenants")
    
    new_id = f"tenant-{str(uuid.uuid4())[:8]}"
    new_tenant = {
        "id": new_id,
        "name": tenant.name,
        "domain": tenant.domain,
        "status": "active",
        "candidate_count": 0
    }
    MOCK_TENANTS[new_id] = new_tenant
    return new_tenant

@router.delete("/{tenant_id}")
def deactivate_tenant(tenant_id: str, user_context: dict = Depends(get_tenant_user)):
    if user_context["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if tenant_id in MOCK_TENANTS:
        MOCK_TENANTS[tenant_id]["status"] = "suspended"
        return {"status": "success", "message": f"Tenant {tenant_id} suspended"}
    raise HTTPException(status_code=404, detail="Tenant not found")
