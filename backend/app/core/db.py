"""
Supabase database client initialization.

Uses the service-role key for server-side operations.
The client is a singleton initialized on import.
"""
from supabase import create_client, Client
from app.core.config import settings


_supabase_client: Client | None = None


def _init_client() -> Client | None:
    """Initialize Supabase client from settings. Returns None if config is missing."""
    url = settings.SUPABASE_URL
    key = settings.SUPABASE_SERVICE_ROLE_KEY

    if not url or url == "https://placeholder.supabase.co":
        print("[WARN] SUPABASE_URL is not configured. Database operations will fail.")
        return None
    if not key or key == "placeholder":
        print("[WARN] SUPABASE_SERVICE_ROLE_KEY is not configured. Database operations will fail.")
        return None

    try:
        client = create_client(url, key)
        print(f"[INFO] Supabase client initialized for: {url}")
        return client
    except Exception as e:
        print(f"[ERROR] Failed to initialize Supabase client: {e}")
        return None


_supabase_client = _init_client()


def get_db() -> Client:
    """
    Returns the Supabase client.
    Raises RuntimeError if the client is not available.
    """
    if _supabase_client is None:
        raise RuntimeError(
            "Supabase client is not initialized. "
            "Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables."
        )
    return _supabase_client


def get_db_or_none() -> Client | None:
    """
    Returns the Supabase client, or None if not initialized.
    Use this only where graceful degradation is acceptable (e.g., health checks).
    """
    return _supabase_client
