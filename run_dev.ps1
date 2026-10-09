Write-Host "Starting SIMATS CBT Platform Development Environment..." -ForegroundColor Green

# Start FastAPI Backend in background
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; if (!(Test-Path venv)) { python -m venv venv }; .\venv\Scripts\Activate; pip install -r requirements.txt; uvicorn main:app --reload --port 8000" -WindowStyle Normal

# Start Vite Frontend in background
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm install; npm run dev" -WindowStyle Normal

Write-Host "Services started in new windows!" -ForegroundColor Cyan
