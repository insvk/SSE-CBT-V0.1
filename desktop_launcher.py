import os
import sys
import io

# In PyInstaller windowed mode (console=False), sys.stdout/sys.stderr are None.
# SafeWriter redirects output cleanly to cbt_desktop.log and satisfies isatty().
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
import ctypes
from ctypes import wintypes
from fastapi.responses import HTMLResponse, FileResponse
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

# Ensure kiosk-guard.js route is always served
kiosk_js_dist = os.path.join(dist_dir, "kiosk-guard.js")
kiosk_js_public = os.path.join(BASE_DIR, "public", "kiosk-guard.js")
kiosk_js_path = kiosk_js_dist if os.path.isfile(kiosk_js_dist) else kiosk_js_public

if os.path.isfile(kiosk_js_path):
    @app.get("/kiosk-guard.js", include_in_schema=False)
    async def serve_kiosk_guard_script():
        return FileResponse(kiosk_js_path, media_type="application/javascript")

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
                with open(p, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                # Ensure kiosk-guard.js is present
                if "kiosk-guard.js" not in content and "<head>" in content:
                    content = content.replace("<head>", '<head>\n<script src="/kiosk-guard.js"></script>')
                async def handler():
                    return HTMLResponse(content)
                return handler
            app.add_api_route(f"/{hf}", make_handler(filepath), methods=["GET"], include_in_schema=False)

    @app.get("/portal", include_in_schema=False)
    @app.get("/app", include_in_schema=False)
    @app.get("/", include_in_schema=False)
    async def serve_portal():
        login_path = os.path.join(dist_dir, "login.html")
        if os.path.isfile(login_path):
            with open(login_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            if "kiosk-guard.js" not in content and "<head>" in content:
                content = content.replace("<head>", '<head>\n<script src="/kiosk-guard.js"></script>')
            return HTMLResponse(content)
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


# --- WIN32 HARDWARE-LEVEL KIOSK KEYBOARD INTERCEPTOR ---
LRESULT = ctypes.c_ssize_t
HOOKPROC = ctypes.WINFUNCTYPE(LRESULT, ctypes.c_int, wintypes.WPARAM, wintypes.LPARAM)

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

user32.SetWindowsHookExW.argtypes = [ctypes.c_int, HOOKPROC, wintypes.HINSTANCE, wintypes.DWORD]
user32.SetWindowsHookExW.restype = wintypes.HHOOK
user32.CallNextHookEx.argtypes = [wintypes.HHOOK, ctypes.c_int, wintypes.WPARAM, wintypes.LPARAM]
user32.CallNextHookEx.restype = LRESULT
user32.UnhookWindowsHookEx.argtypes = [wintypes.HHOOK]
user32.UnhookWindowsHookEx.restype = wintypes.BOOL

class KBDLLHOOKSTRUCT(ctypes.Structure):
    _fields_ = [
        ("vkCode", wintypes.DWORD),
        ("scanCode", wintypes.DWORD),
        ("flags", wintypes.DWORD),
        ("time", wintypes.DWORD),
        ("dwExtraInfo", ctypes.c_ulong),
    ]

LLKHF_ALTDOWN = 0x20

_hook_handle = None
_hook_proc_ref = None

window_ref = {"win": None}
is_authorized_exit = [False]

def install_keyboard_hook():
    global _hook_handle, _hook_proc_ref

    def low_level_keyboard_handler(nCode, wParam, lParam):
        if nCode >= 0:
            kbd = ctypes.cast(lParam, ctypes.POINTER(KBDLLHOOKSTRUCT)).contents
            vk = kbd.vkCode
            alt_pressed = bool(kbd.flags & LLKHF_ALTDOWN)
            ctrl_pressed = bool(user32.GetAsyncKeyState(0x11) & 0x8000)
            shift_pressed = bool(user32.GetAsyncKeyState(0x10) & 0x8000)

            # 1. Supervisor Hotkey: Ctrl + Shift + X (0x58) -> Trigger Exit Modal!
            if ctrl_pressed and shift_pressed and vk == 0x58:
                win = window_ref.get("win")
                if win:
                    try:
                        win.evaluate_js("window.showKioskExitModal && window.showKioskExitModal()")
                    except Exception:
                        pass
                return 1

            # 2. Block ALL Function Keys F1 through F12 (0x70 to 0x7B)
            if 0x70 <= vk <= 0x7B:
                # Special check: If Alt+F4 (0x73), trigger exit modal!
                if alt_pressed and vk == 0x73:
                    win = window_ref.get("win")
                    if win:
                        try:
                            win.evaluate_js("window.showKioskExitModal && window.showKioskExitModal()")
                        except Exception:
                            pass
                return 1 # Discard F1..F12 (F5 refresh, F11 fullscreen, F12 devtools, etc.)

            # 3. Block Windows Keys (Left Win 0x5B, Right Win 0x5C) & Apps Key (0x5D)
            if vk in (0x5B, 0x5C, 0x5D):
                return 1

            # 4. Block Escape (0x1B)
            if vk == 0x1B:
                return 1

            # 5. Block ALL ALT combinations (Alt+Tab, Alt+Esc, Alt+Space, Alt+Arrows, etc.)
            if alt_pressed:
                return 1

            # 6. Block ALL CTRL combinations EXCEPT allowed text editing (A, C, V, X, Y, Z)
            if ctrl_pressed:
                if shift_pressed:
                    return 1 # Block all Ctrl+Shift (DevTools, etc.)
                # Allowed typing shortcuts: A (0x41), C (0x43), V (0x56), X (0x58), Y (0x59), Z (0x5A)
                if vk not in (0x41, 0x43, 0x56, 0x58, 0x59, 0x5A):
                    return 1 # Block Ctrl+W, Ctrl+R, Ctrl+T, Ctrl+N, Ctrl+P, Ctrl+S, Ctrl+U, etc.!

        return user32.CallNextHookEx(None, nCode, wParam, lParam)

    _hook_proc_ref = HOOKPROC(low_level_keyboard_handler)
    _hook_handle = user32.SetWindowsHookExW(13, _hook_proc_ref, None, 0)


def uninstall_keyboard_hook():
    global _hook_handle
    if _hook_handle:
        try:
            user32.UnhookWindowsHookEx(_hook_handle)
        except Exception:
            pass
        _hook_handle = None


class DesktopBridgeApi:
    """Secure JS Bridge for Kiosk Management & Date PIN Authentication."""
    def __init__(self, win_holder, exit_callback):
        self.win_holder = win_holder
        self.exit_callback = exit_callback

    def is_desktop_mode(self) -> bool:
        return True

    def toggle_fullscreen(self) -> bool:
        win = self.win_holder.get("win")
        if win:
            win.toggle_fullscreen()
            return bool(getattr(win, "fullscreen", False))
        return False

    def exit_app(self) -> None:
        self.exit_callback()

    def verify_and_exit(self, pin: str) -> dict:
        """
        Validates the invigilator exit PIN against current system date (YYYYMMDD).
        Never exposes the expected PIN to client code.
        """
        from datetime import datetime, timezone
        p = str(pin).strip()
        local_date = datetime.now().strftime("%Y%m%d")
        utc_date = datetime.now(timezone.utc).strftime("%Y%m%d")

        try:
            from backend.app.core.master_clock import get_current_ist_datetime
            ist_date = get_current_ist_datetime().strftime("%Y%m%d")
        except Exception:
            ist_date = local_date

        valid_pins = {local_date, utc_date, ist_date}
        if p in valid_pins:
            threading.Thread(target=self.exit_callback).start()
            return {"status": "success", "authorized": True, "message": "Invigilator authorization verified."}
        return {"status": "error", "authorized": False, "message": "Invalid invigilator authorization key."}


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
    print("  SSE CBT PLATFORM V0.1 - HARDENED KIOSK EXAMINATION SYSTEM")
    print("=" * 72)
    print(f"  * Local Server Address : http://127.0.0.1:{port}")
    print(f"  * Application URL      : {target_url}")
    print(f"  * Mode                 : Fullscreen Desktop Kiosk Lockdown")
    print("=" * 72)

    # Start FastAPI / Uvicorn server in background thread
    server_thread = UvicornServerThread(app, port)
    server_thread.start()

    # Wait until server accepts connections
    wait_for_server(port)

    # Install low-level Windows hardware keyboard hook for kiosk lockdown
    install_keyboard_hook()

    def do_authorized_exit():
        is_authorized_exit[0] = True
        time.sleep(0.3)
        uninstall_keyboard_hook()
        win = window_ref.get("win")
        if win:
            try:
                win.destroy()
            except Exception:
                pass
        os._exit(0)

    bridge_api = DesktopBridgeApi(window_ref, do_authorized_exit)

    try:
        import webview
        # Disable browser devtools, menus, and browser accelerator keys in WebView2
        webview.settings["OPEN_DEVTOOLS_IN_DEBUG"] = False
        webview.settings["SHOW_DEFAULT_MENUS"] = False

        app_data = os.environ.get("LOCALAPPDATA", tempfile.gettempdir())
        storage_path = os.path.join(app_data, "SSE_CBT_Platform_Cache")
        os.makedirs(storage_path, exist_ok=True)

        win = webview.create_window(
            title="SSE CBT Examination Platform - National Testing Authority",
            url=target_url,
            fullscreen=True,
            min_size=(1024, 720),
            confirm_close=False,
            background_color="#0b1120",
            js_api=bridge_api
        )
        window_ref["win"] = win

        # Guard against unauthorized window closing
        def on_window_closing():
            if is_authorized_exit[0]:
                return True # Allow close
            # Trigger Invigilator PIN modal in the webview
            try:
                win.evaluate_js("window.showKioskExitModal && window.showKioskExitModal()")
            except Exception:
                pass
            return False # Cancel the close event!

        win.events.closing += on_window_closing

        # Run native message pump on main thread with debug=False to enforce accelerator lockdown
        webview.start(debug=False, storage_path=storage_path)

    except Exception as e:
        print(f"[CBT Desktop] pywebview window error ({e}). Launching fallback fullscreen kiosk app...")
        launch_browser_kiosk_fallback(target_url)
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            pass
    finally:
        uninstall_keyboard_hook()
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
