Write-Host "Starting SIMATS CBT Platform Development Environment..." -ForegroundColor Green

# 1. Start FastAPI Backend in background
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\backend'; if (Test-Path '..\.venv\Scripts\Activate.ps1') { & '..\.venv\Scripts\Activate.ps1' } elseif (Test-Path 'venv\Scripts\Activate.ps1') { & 'venv\Scripts\Activate.ps1' }; uvicorn main:app --reload --port 8000" -WindowStyle Normal

# 2. Start Vite Frontend in background (from root directory where package.json lives)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot'; npm run dev" -WindowStyle Normal

Write-Host "Backend (port 8000) and Frontend Vite dev server launched!" -ForegroundColor Cyan
