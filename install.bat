@echo off
echo Installing Security Alert Prioritization Dashboard...
echo.

echo Step 1: Installing root dependencies...
npm install
if %errorlevel% neq 0 (
    echo Error installing root dependencies!
    pause
    exit /b 1
)

echo.
echo Step 2: Installing client dependencies...
cd client
npm install
if %errorlevel% neq 0 (
    echo Error installing client dependencies!
    pause
    exit /b 1
)
cd ..

echo.
echo Step 3: Creating logs directory...
if not exist "logs" mkdir logs

echo.
echo Step 4: Creating config directory...
if not exist "config" mkdir config

echo.
echo Installation completed successfully!
echo.
echo Next steps:
echo 1. Copy env.example to .env
echo 2. Edit .env with your API keys
echo 3. Run: npm run dev
echo.
pause
