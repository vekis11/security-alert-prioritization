@echo off
echo Starting Security Alert Prioritization Dashboard...
echo.

echo Starting backend server...
start "Backend Server" cmd /k "cd /d %~dp0 && npm run server"

echo Waiting 3 seconds for server to start...
timeout /t 3 /nobreak > nul

echo Starting frontend client...
start "Frontend Client" cmd /k "cd /d %~dp0\client && npm start"

echo.
echo Both servers are starting in separate windows...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Press any key to close this window...
pause > nul
