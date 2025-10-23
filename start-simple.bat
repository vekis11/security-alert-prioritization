@echo off
echo ========================================
echo SECURITY DASHBOARD - BRUTAL START
echo ========================================

echo.
echo Step 1: Killing all Node processes...
taskkill /f /im node.exe 2>nul

echo.
echo Step 2: Starting Backend Server...
start "Backend" cmd /k "cd /d %~dp0 && npm run server"

echo.
echo Step 3: Waiting 5 seconds...
ping 127.0.0.1 -n 6 > nul

echo.
echo Step 4: Starting Frontend Client...
start "Frontend" cmd /k "cd /d %~dp0\client && npm start"

echo.
echo ========================================
echo DASHBOARD STARTING...
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000
echo ========================================
echo.
echo Opening browser in 10 seconds...
ping 127.0.0.1 -n 11 > nul
start http://localhost:3000

echo.
echo Press any key to close this window...
pause > nul
