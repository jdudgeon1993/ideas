"""
Supabase Client - Python Age 5.0

Connection to Supabase for database operations.
Python handles all logic, Supabase handles storage.
"""

from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError(
        "Missing Supabase configuration! "
        "Please set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env file"
    )

# Initialize Supabase client (singleton)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def get_supabase() -> Client:
    """
    Get Supabase client instance.
    Use this in API endpoints for dependency injection.
    """
    return supabase
