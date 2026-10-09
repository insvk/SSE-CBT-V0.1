import os
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://mock-url.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "mock-service-key")

try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    # Fallback to prevent crash if env vars are missing during dev
    print(f"Warning: Failed to initialize Supabase client: {e}")
    supabase = None

def get_db():
    return supabase
