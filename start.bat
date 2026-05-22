@echo off
title Akhtar Jewellers ERP
cd /d "C:\Users\basim\Desktop\ERP\JewelleryErp"

echo.
echo  ================================================
echo       AKHTAR JEWELLERS ERP  -  Starting...
echo  ================================================
echo.
echo  Please wait while the server starts.
echo  This takes about 10-15 seconds.
echo.

:: Check that setup has been run
if not exist ".env" (
    echo  ERROR: Setup has not been run yet.
    echo  Please run setup.bat first, then try again.
    echo.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo  ERROR: Dependencies not installed.
    echo  Please run setup.bat first, then try again.
    echo.
    pause
    exit /b 1
)

:: Kill any process already using port 3000
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

:: Start Next.js server in background (output to log file)
start "" /b cmd /c "npm run dev > "%TEMP%\akhtar_erp.log" 2>&1"

:: Poll until the server responds (up to 2 minutes)
echo  Waiting for server to be ready...
set /a TRIES=0
:WAIT
set /a TRIES+=1
if %TRIES% GTR 60 (
    echo.
    echo  ERROR: Server did not start within 2 minutes.
    echo  Check log file: %TEMP%\akhtar_erp.log
    echo.
    pause
    exit /b 1
)
timeout /t 2 /nobreak >nul 2>&1
powershell -NoProfile -Command ^
  "try{$null=(Invoke-WebRequest http://localhost:3000 -UseBasicParsing -TimeoutSec 1).StatusCode;exit 0}catch{exit 1}" >nul 2>&1
if errorlevel 1 goto WAIT

:: Server is ready — open browser
echo  Server ready!
start http://localhost:3000

echo.
echo  ================================================
echo   Akhtar Jewellers ERP is running!
echo.
echo   Open your browser to: http://localhost:3000
echo.
echo   Keep this window open.
echo   Close it to STOP the server.
echo  ================================================
echo.

:KEEP
timeout /t 30 /nobreak >nul 2>&1
goto KEEP
