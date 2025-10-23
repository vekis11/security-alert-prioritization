Write-Host "Starting Security Alert Prioritization Dashboard..." -ForegroundColor Green
Write-Host ""

# Start backend server
Write-Host "Starting backend server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; npm run server"

# Wait a moment
Start-Sleep -Seconds 3

# Start frontend client
Write-Host "Starting frontend client..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\client'; npm start"

Write-Host ""
Write-Host "Both servers are starting in separate windows..." -ForegroundColor Green
Write-Host "Backend: http://localhost:5000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to close this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
