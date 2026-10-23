@echo off
echo ========================================================
echo   SSE CBT PLATFORM - STANDALONE EXECUTABLE BUILDER
echo ========================================================
echo 1. Building Vite Production Bundle (HTML, CSS, JS)...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Frontend build failed!
    exit /b %ERRORLEVEL%
)

echo 2. Packaging Standalone Windows Executable (.exe)...
call .\.venv\Scripts\pyinstaller.exe --noconfirm cbt_platform.spec
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] PyInstaller packaging failed!
    exit /b %ERRORLEVEL%
)

copy /Y "dist\SSE_CBT_Platform.exe" ".\SSE_CBT_Platform.exe" >nul
echo.
echo ========================================================
echo   BUILD COMPLETE!
echo   Executable location: %CD%\SSE_CBT_Platform.exe
echo ========================================================
pause
