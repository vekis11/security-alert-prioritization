@echo off
echo ========================================
echo FINAL NUCLEAR START - FIXING EVERYTHING
echo ========================================

echo.
echo Step 1: Killing ALL processes...
taskkill /f /im node.exe 2>nul
taskkill /f /im npm.exe 2>nul
taskkill /f /im nodemon.exe 2>nul

echo.
echo Step 2: Installing missing dependencies...
cd client
npm install @heroicons/react chart.js react-chartjs-2 @tailwindcss/forms react-router-dom react-query react-hot-toast
cd ..

echo.
echo Step 3: Starting Backend Server...
start "Backend Server" cmd /k "cd /d %~dp0 && npm run server"

echo.
echo Step 4: Waiting 5 seconds...
ping 127.0.0.1 -n 6 > nul

echo.
echo Step 5: Starting Frontend Client...
start "Frontend Client" cmd /k "cd /d %~dp0\client && npm start"

echo.
echo ========================================
echo DASHBOARD SHOULD NOW BE WORKING!
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
