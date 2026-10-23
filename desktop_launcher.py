import os
import sys
import socket
import threading
import time
import webbrowser
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

# Determine base directory whether running in normal Python or frozen PyInstaller exe
if getattr(sys, "frozen", False):
    BASE_DIR = getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

backend_dir = os.path.join(BASE_DIR, "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from backend.main import app

dist_dir = os.path.join(BASE_DIR, "dist")

if os.path.isdir(dist_dir):
    assets_dir = os.path.join(dist_dir, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="dist_assets")

    html_files = [
        "login.html",
        "admin.html",
        "exam.html",
        "scorecard.html",
        "instructions.html",
        "candidate_dashboard.html",
        "question_bank.html",
        "register.html",
        "terms.html",
        "privacy.html",
        "index.html",
    ]

    for hf in html_files:
        filepath = os.path.join(dist_dir, hf)
        if os.path.isfile(filepath):
            def make_handler(p=filepath):
                async def handler():
                    return FileResponse(p)
                return handler
            app.add_api_route(f"/{hf}", make_handler(filepath), methods=["GET"], include_in_schema=False)

    @app.get("/portal", include_in_schema=False)
    @app.get("/app", include_in_schema=False)
    async def serve_portal():
        login_path = os.path.join(dist_dir, "login.html")
        if os.path.isfile(login_path):
            return FileResponse(login_path)
        return {"status": "ok", "message": "SSE CBT Platform Running"}


def find_available_port(start_port=8000, max_port=8020) -> int:
    for port in range(start_port, max_port):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(("127.0.0.1", port)) != 0:
                return port
    return start_port


def open_browser_after_launch(port: int):
    time.sleep(1.2)
    url = f"http://127.0.0.1:{port}/login.html"
    try:
        webbrowser.open(url)
    except Exception:
        pass


if __name__ == "__main__":
    import uvicorn
    import multiprocessing
    multiprocessing.freeze_support()

    port = find_available_port(8000)
    print("=" * 72)
    print("  SSE CBT PLATFORM V0.1 - OFFICIAL EXAMINATION SYSTEM (STANDALONE)")
    print("=" * 72)
    print(f"  * Local Server Address : http://127.0.0.1:{port}")
    print(f"  * Candidate Portal     : http://127.0.0.1:{port}/login.html")
    print(f"  * Admin Command Hub    : http://127.0.0.1:{port}/admin.html")
    print(f"  * Exam Terminal        : http://127.0.0.1:{port}/exam.html")
    print("=" * 72)
    print("  Launching default web browser automatically...")
    print("  Keep this console window open during the examination session.")
    print("=" * 72)

    threading.Thread(target=open_browser_after_launch, args=(port,), daemon=True).start()
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
