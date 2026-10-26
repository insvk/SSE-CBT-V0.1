import os
import sys
import io

# In PyInstaller windowed mode (console=False), sys.stdout/sys.stderr are None.
# Uvicorn's logging formatter calls sys.stdout.isatty(), causing AttributeError if None.
class SafeWriter:
    def __init__(self, log_path=None):
        self.log_path = log_path

    def isatty(self) -> bool:
        return False

    def write(self, s: str):
        if not s:
            return
        if self.log_path:
            try:
                with open(self.log_path, "a", encoding="utf-8") as f:
                    f.write(s)
            except Exception:
                pass

    def flush(self):
        pass

if getattr(sys, "frozen", False):
    EXE_DIR = os.path.dirname(sys.executable)
else:
    EXE_DIR = os.path.dirname(os.path.abspath(__file__))

desktop_log_file = os.path.join(EXE_DIR, "cbt_desktop.log")

if sys.stdout is None:
    sys.stdout = SafeWriter(desktop_log_file)
if sys.stderr is None:
    sys.stderr = SafeWriter(desktop_log_file)
if sys.stdin is None:
    sys.stdin = io.StringIO()

import socket
import threading
import time
import subprocess
import webbrowser
import tempfile
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

# Determine base directory whether running in normal Python or frozen PyInstaller exe
if getattr(sys, "frozen", False):
    BASE_DIR = getattr(sys, "_MEIPASS", EXE_DIR)
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

    @app.get("/", include_in_schema=False)
    async def serve_root():
        login_path = os.path.join(dist_dir, "login.html")
        if os.path.isfile(login_path):
            return FileResponse(login_path)
        return {"status": "ok", "message": "SSE CBT Platform Running"}


def find_available_port(start_port=8000, max_port=8040) -> int:
    for port in range(start_port, max_port):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(("127.0.0.1", port)) != 0:
                return port
    return start_port


def wait_for_server(port: int, timeout: float = 10.0) -> bool:
    start = time.time()
    while time.time() - start < timeout:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(0.3)
                if s.connect_ex(("127.0.0.1", port)) == 0:
                    return True
        except Exception:
            pass
        time.sleep(0.1)
    return False


class UvicornServerThread(threading.Thread):
    def __init__(self, asgi_app, port: int):
        super().__init__(daemon=True)
        import uvicorn
        # log_config=None prevents uvicorn from configuring its default formatter that fails without a TTY
        config = uvicorn.Config(
            app=asgi_app,
            host="127.0.0.1",
            port=port,
            log_level="warning",
            access_log=False,
            log_config=None
        )
        self.server = uvicorn.Server(config=config)

    def run(self):
        try:
            self.server.run()
        except Exception as e:
            if sys.stderr:
                sys.stderr.write(f"Uvicorn server error: {e}\n")

    def stop(self):
        self.server.should_exit = True


class DesktopBridgeApi:
    """JS Bridge allowing frontend to interact with desktop host if desired."""
    def __init__(self, window_ref):
        self.window_ref = window_ref

    def is_desktop_mode(self) -> bool:
        return True

    def toggle_fullscreen(self) -> bool:
        win = self.window_ref.get("win")
        if win:
            win.toggle_fullscreen()
            return bool(getattr(win, "fullscreen", False))
        return False

    def exit_app(self) -> None:
        win = self.window_ref.get("win")
        if win:
            win.destroy()


def launch_browser_kiosk_fallback(url: str) -> bool:
    """Launch Microsoft Edge or Chrome in app-kiosk fullscreen mode as fallback."""
    candidates = [
        os.path.expandvars(r"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%LocalAppData%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%ProgramFiles%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%LocalAppData%\Google\Chrome\Application\chrome.exe"),
    ]
    for exe in candidates:
        if os.path.isfile(exe):
            try:
                subprocess.Popen([
                    exe,
                    f"--app={url}",
                    "--start-fullscreen",
                    "--new-window",
                    "--no-first-run",
                    "--no-default-browser-check"
                ])
                return True
            except Exception:
                continue
    try:
        webbrowser.open(url)
        return True
    except Exception:
        return False


def main():
    import multiprocessing
    multiprocessing.freeze_support()

    port = find_available_port(8000)
    target_url = f"http://127.0.0.1:{port}/login.html"

    print("=" * 72)
    print("  SSE CBT PLATFORM V0.1 - NATIVE DESKTOP EXAMINATION SYSTEM")
    print("=" * 72)
    print(f"  * Local Server Address : http://127.0.0.1:{port}")
    print(f"  * Application URL      : {target_url}")
    print(f"  * Mode                 : Fullscreen Desktop Application")
    print("=" * 72)

    # Start FastAPI / Uvicorn server in background thread
    server_thread = UvicornServerThread(app, port)
    server_thread.start()

    # Wait until server accepts connections
    wait_for_server(port)

    # Try launching native WebView2 full-screen window via pywebview
    window_ref = {"win": None}
    bridge_api = DesktopBridgeApi(window_ref)

    try:
        import webview

        app_data = os.environ.get("LOCALAPPDATA", tempfile.gettempdir())
        storage_path = os.path.join(app_data, "SSE_CBT_Platform_Cache")
        os.makedirs(storage_path, exist_ok=True)

        win = webview.create_window(
            title="SSE CBT Examination Platform - National Testing Authority",
            url=target_url,
            fullscreen=True,
            min_size=(1024, 720),
            confirm_close=True,
            background_color="#0b1120",
            js_api=bridge_api
        )
        window_ref["win"] = win

        # Run native message pump on main thread
        webview.start(storage_path=storage_path)

    except Exception as e:
        print(f"[CBT Desktop] pywebview window error ({e}). Launching fallback fullscreen kiosk app...")
        launch_browser_kiosk_fallback(target_url)
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            pass
    finally:
        server_thread.stop()


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        import traceback
        err = traceback.format_exc()
        try:
            err_log_path = os.path.join(EXE_DIR, "cbt_desktop_error.log")
            with open(err_log_path, "w", encoding="utf-8") as f:
                f.write(err)
        except Exception:
            pass
        try:
            import ctypes
            ctypes.windll.user32.MessageBoxW(0, f"Error launching CBT Platform:\n\n{e}\n\nCheck cbt_desktop_error.log", "SSE CBT Platform Launch Error", 0x10)
        except Exception:
            pass
        sys.exit(1)
