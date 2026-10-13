import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
backend_dir = os.path.join(root_dir, "backend")

candidate_paths = [
    backend_dir,
    os.path.join(os.getcwd(), "backend"),
    os.path.join("/var/task", "backend"),
    os.path.abspath("backend"),
]

for p in candidate_paths:
    if os.path.exists(p) and p not in sys.path:
        sys.path.insert(0, p)

try:
    from main import app  # noqa: F401, E402
except ImportError:
    from backend.main import app  # noqa: F401, E402
