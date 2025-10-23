@echo off
echo ========================================
echo NUCLEAR RESTART - KILLING EVERYTHING
echo ========================================

echo.
echo Step 1: Killing ALL Node processes...
taskkill /f /im node.exe 2>nul
taskkill /f /im npm.exe 2>nul
taskkill /f /im nodemon.exe 2>nul

echo.
echo Step 2: Waiting 2 seconds...
timeout /t 2 /nobreak > nul

echo.
echo Step 3: Starting fresh...
call start.bat
