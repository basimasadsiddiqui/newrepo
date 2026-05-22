@echo off
title Jewellery ERP - Setup
color 0E

echo.
echo  ============================================
echo       Jewellery ERP  -  Setup Wizard
echo  ============================================
echo.
echo  This will set up everything automatically.
echo  Please do not close this window.
echo.

:: Check if PowerShell is available
where powershell >nul 2>&1
if errorlevel 1 (
    echo  ERROR: PowerShell is required but not found.
    echo  Please install PowerShell and try again.
    pause
    exit /b 1
)

:: Run the PowerShell setup script with elevated execution policy
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"

if errorlevel 1 (
    echo.
    echo  Setup encountered an error. See messages above.
    pause
    exit /b 1
)

exit /b 0
