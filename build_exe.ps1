Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  SSE CBT PLATFORM - STANDALONE EXECUTABLE BUILDER" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

Write-Host "1. Building Vite Production Bundle (HTML, CSS, JS)..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Frontend build failed!" -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "2. Packaging Standalone Windows Executable (.exe)..." -ForegroundColor Yellow
& ".\.venv\Scripts\pyinstaller.exe" --noconfirm cbt_platform.spec
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] PyInstaller packaging failed!" -ForegroundColor Red
    exit $LASTEXITCODE
}

Copy-Item "dist\SSE_CBT_Platform.exe" -Destination ".\SSE_CBT_Platform.exe" -Force
Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "  BUILD COMPLETE!" -ForegroundColor Green
Write-Host "  Executable location: $PSScriptRoot\SSE_CBT_Platform.exe" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
