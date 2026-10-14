import os
import sys

root_dir = os.path.dirname(os.path.abspath(__file__))
api_dir = os.path.join(root_dir, "api")
backend_dir = os.path.join(root_dir, "backend")

for p in [api_dir, backend_dir, root_dir]:
    if os.path.exists(p) and p not in sys.path:
        sys.path.insert(0, p)

from index import app, application, handler  # noqa: F401, E402
