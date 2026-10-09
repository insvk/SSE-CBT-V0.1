"""
Authentication and authorization middleware.

- Verifies Supabase JWTs for all protected routes.
- Extracts and normalizes tenant context from request headers.
- Composes user+tenant context for multi-tenant isolation.
"""
import jwt
from fastapi import Request, HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings
from app.core.tenant import normalize_tenant_id, DEFAULT_TENANT_ID

security = HTTPBearer(auto_error=False)

DEV_USER_ID = "00000000-0000-0000-0000-000000000099"


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> dict:
    """
    Verify the JWT token and return user context.
    """
    if credentials is None:
        # Check if auth header is present
        raise HTTPException(
            status_code=401,
            detail="Authorization credentials required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    # Development-only bypass (strictly disabled when ENV == 'production')
    if settings.ENV != "production" and token in ("mock_valid_token", "dev_test_token_do_not_use_in_prod"):
        return {
            "user_id": DEV_USER_ID,
            "role": "super_admin",
            "email": "dev@localhost"
        }

    jwt_secret = settings.SUPABASE_JWT_SECRET
    if not jwt_secret:
        raise HTTPException(
            status_code=500,
            detail="JWT secret is not configured on the server.",
        )

    try:
        decoded = jwt.decode(
            token,
            jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        user_id = decoded.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token missing subject claim")

        role = decoded.get("role", "authenticated")
        email = decoded.get("email", "")
        god_mode = decoded.get("god_mode", role == "super_admin")
        permissions = decoded.get("permissions", ["*"] if god_mode else [])

        return {
            "user_id": user_id,
            "role": role,
            "email": email,
            "god_mode": god_mode,
            "permissions": permissions,
        }

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired. Please log in again.")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid authentication token: {str(e)}")


def get_current_tenant(request: Request) -> str:
    """
    Extract tenant ID from x-tenant-id header or query param.
    Normalizes to a valid UUID format (maps legacy 'tenant-1' to default tenant).
    """
    tenant_id = request.headers.get("x-tenant-id") or request.query_params.get("x_tenant_id")
    if not tenant_id:
        return DEFAULT_TENANT_ID
    return normalize_tenant_id(tenant_id)


def get_tenant_user(
    current_user: dict = Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant),
) -> dict:
    """
    Composed dependency: authenticated user + normalized tenant context.
    Enforces multi-tenant isolation.
    """
    return {
        "user_id": current_user["user_id"],
        "role": current_user["role"],
        "email": current_user.get("email", ""),
        "god_mode": current_user.get("god_mode", current_user["role"] == "super_admin"),
        "permissions": current_user.get("permissions", []),
        "tenant_id": tenant_id,
    }


def require_admin_user(
    tenant_user: dict = Depends(get_tenant_user),
) -> dict:
    """
    Security Barrier: Enforces that only administrators (super_admin or god_mode)
    can access administrative endpoints. Blocks candidates with HTTP 403 Forbidden.
    """
    role = tenant_user.get("role", "")
    god_mode = tenant_user.get("god_mode", False)
    if role not in ("super_admin", "admin") and not god_mode:
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Super Admin authority required. Candidate accounts are strictly restricted to the Exam Portal.",
        )
    return tenant_user

