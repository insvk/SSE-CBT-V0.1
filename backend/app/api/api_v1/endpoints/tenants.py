import uuid
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import get_tenant_user
from app.core.db import get_db
from app.core.tenant import normalize_tenant_id, ensure_tenant_exists
from app.schemas import TenantCreate, TenantResponse

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/", response_model=List[TenantResponse])
def get_tenants(user_context: dict = Depends(get_tenant_user)):
    """Fetch tenants with candidate counts from the real database."""
    db = get_db()
    is_super_admin = user_context.get("role") == "super_admin"
    current_tid = user_context.get("tenant_id")

    try:
        query = db.table("tenants").select("*")
        if not is_super_admin and current_tid:
            query = query.eq("id", current_tid)

        res = query.execute()
        tenants_data = res.data or []

        # If empty and requested current tenant, ensure default tenant exists
        if not tenants_data and current_tid:
            ensure_tenant_exists(db, current_tid)
            res = db.table("tenants").select("*").eq("id", current_tid).execute()
            tenants_data = res.data or []

        results = []
        for t in tenants_data:
            tid = str(t["id"])
            # Get candidate count
            try:
                cand_res = db.table("candidates").select("id", count="exact").eq("tenant_id", tid).execute()
                cand_count = cand_res.count if cand_res.count is not None else len(cand_res.data or [])
            except Exception:
                cand_count = 0

            results.append(TenantResponse(
                id=tid,
                name=t.get("name", "Unnamed Tenant"),
                domain=t.get("domain", ""),
                status="active",
                candidate_count=cand_count,
            ))

        return results

    except Exception as e:
        logger.error("Failed to query tenants: %s", e)
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.post("/", response_model=TenantResponse)
def create_tenant(tenant: TenantCreate, user_context: dict = Depends(get_tenant_user)):
    """Create a new tenant in the database."""
    if user_context.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Not authorized to create tenants")

    db = get_db()
    new_id = str(uuid.uuid4())

    try:
        res = db.table("tenants").insert({
            "id": new_id,
            "name": tenant.name.strip(),
            "domain": tenant.domain.strip(),
        }).execute()

        if not res.data:
            raise HTTPException(status_code=500, detail="Failed to insert tenant record")

        row = res.data[0]
        return TenantResponse(
            id=str(row["id"]),
            name=row["name"],
            domain=row["domain"],
            status="active",
            candidate_count=0,
        )
    except Exception as e:
        logger.error("Failed to create tenant: %s", e)
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.delete("/{tenant_id}")
def deactivate_tenant(tenant_id: str, user_context: dict = Depends(get_tenant_user)):
    """Deactivate or remove a tenant."""
    if user_context.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Not authorized to deactivate tenants")

    db = get_db()
    norm_id = normalize_tenant_id(tenant_id)

    try:
        res = db.table("tenants").delete().eq("id", norm_id).execute()
        return {"status": "success", "message": f"Tenant {tenant_id} deleted"}
    except Exception as e:
        logger.error("Failed to delete tenant: %s", e)
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
