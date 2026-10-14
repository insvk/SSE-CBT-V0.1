import uuid
import logging
from app.core.db import get_db

logger = logging.getLogger(__name__)

DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001"
DEFAULT_TENANT_NAME = "SIMATS Engineering"
DEFAULT_TENANT_DOMAIN = "simats.edu"


def normalize_tenant_id(raw_tenant: str) -> str:
    """
    Normalizes a tenant ID string to a valid UUID format.
    Maps legacy identifiers ('tenant-1', 'default', '') to DEFAULT_TENANT_ID.
    For other strings, generates a deterministic UUIDv5.
    """
    if not raw_tenant or raw_tenant in ("tenant-1", "default", "primary"):
        return DEFAULT_TENANT_ID
    try:
        val = uuid.UUID(raw_tenant)
        return str(val)
    except (ValueError, AttributeError):
        return str(uuid.uuid5(uuid.NAMESPACE_DNS, raw_tenant))


def ensure_tenant_exists(db, tenant_id: str, name: str = DEFAULT_TENANT_NAME, domain: str = DEFAULT_TENANT_DOMAIN):
    """
    Ensures that a tenant record exists in public.tenants so foreign keys won't fail.
    """
    norm_id = normalize_tenant_id(tenant_id)
    try:
        existing = db.table("tenants").select("id").eq("id", norm_id).limit(1).execute()
        if not existing.data:
            unique_domain = domain if norm_id == DEFAULT_TENANT_ID else f"{norm_id[:8]}.{domain}"
            db.table("tenants").insert({
                "id": norm_id,
                "name": name,
                "domain": unique_domain
            }).execute()
            logger.info("Created tenant record for: %s", norm_id)
    except Exception as e:
        logger.warning("Could not ensure tenant exists: %s", e)
    return norm_id
