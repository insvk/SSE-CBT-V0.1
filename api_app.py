"""
Vercel serverless entrypoint for SIMATS CBT Platform API.
Delegates directly to the authoritative backend application in backend/main.py.
Eliminates duplicate mock routes (Defect C-06).
"""
import os
import sys

backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from main import app  # noqa: E402
