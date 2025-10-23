Write-Host "========================================" -ForegroundColor Green
Write-Host "SECURITY DASHBOARD - NUCLEAR START" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

Write-Host ""
Write-Host "Step 1: Killing all Node processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Step 2: Starting Backend Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; Write-Host 'Backend Server Starting...' -ForegroundColor Green; npm run server"

Write-Host ""
Write-Host "Step 3: Waiting 5 seconds for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "Step 4: Starting Frontend Client..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\client'; Write-Host 'Frontend Client Starting...' -ForegroundColor Green; npm start"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "DASHBOARD STARTING..." -ForegroundColor Green
Write-Host "Backend:  http://localhost:5000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Green

Write-Host ""
Write-Host "Opening browser in 10 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 10
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "Press any key to close this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
