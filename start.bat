@echo off
echo ========================================
echo SECURITY DASHBOARD - SIMPLE START
echo ========================================

echo.
echo Killing all Node processes...
taskkill /f /im node.exe 2>nul

echo.
echo Starting Backend Server...
start "Backend" cmd /k "cd /d %~dp0 && npm run server"

echo.
echo Waiting 3 seconds...
timeout /t 3 /nobreak > nul

echo.
echo Starting Frontend Client...
start "Frontend" cmd /k "cd /d %~dp0\client && npm start"

echo.
echo ========================================
echo DASHBOARD STARTING...
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000
echo ========================================
echo.
echo Opening browser in 8 seconds...
timeout /t 8 /nobreak > nul
start http://localhost:3000

echo.
echo Press any key to close this window...
pause > nul
