# =============================================================================
#  Jewellery ERP - Automated Setup Script
#  Run once on any Windows machine to install and configure everything.
# =============================================================================

$ErrorActionPreference = "Continue"   # Native exe stderr must NOT trigger Stop
$HOST.UI.RawUI.WindowTitle = "Jewellery ERP - Setup"
$ProjectDir = $PSScriptRoot

function Write-Step($n, $msg) {
    Write-Host ""
    Write-Host "  [$n] $msg" -ForegroundColor Cyan
}

function Write-OK($msg)   { Write-Host "      OK  $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "      !!  $msg" -ForegroundColor Yellow }
function Write-Fail($msg) { Write-Host "      XX  $msg" -ForegroundColor Red }

function Pause-OnError($msg) {
    Write-Fail $msg
    Write-Host ""
    Write-Host "  Setup could not continue. Press any key to exit." -ForegroundColor Red
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# ─── Banner ──────────────────────────────────────────────────────────────────

Clear-Host
Write-Host ""
Write-Host "  ============================================" -ForegroundColor DarkYellow
Write-Host "         Jewellery ERP  -  Setup Wizard      " -ForegroundColor Yellow
Write-Host "  ============================================" -ForegroundColor DarkYellow
Write-Host ""
Write-Host "  This will install all required software and" -ForegroundColor Gray
Write-Host "  configure the application on this computer." -ForegroundColor Gray
Write-Host ""

# ─── Step 1: Node.js ─────────────────────────────────────────────────────────

Write-Step "1/6" "Checking Node.js..."

$nodeVer = $null
try { $nodeVer = (node --version 2>$null) } catch {}

if ($nodeVer) {
    Write-OK "Node.js already installed: $nodeVer"
} else {
    Write-Warn "Node.js not found - installing via winget..."
    try {
        $null = winget install OpenJS.NodeJS.LTS `
            --silent `
            --accept-package-agreements `
            --accept-source-agreements 2>&1

        # Reload PATH from registry so node.exe is found immediately
        $machinePath = [System.Environment]::GetEnvironmentVariable("PATH","Machine")
        $userPath    = [System.Environment]::GetEnvironmentVariable("PATH","User")
        $env:PATH    = "$machinePath;$userPath"

        $nodeVer = (node --version 2>$null)
        if (-not $nodeVer) { throw "node.exe not on PATH after install" }
        Write-OK "Node.js installed: $nodeVer"
    }
    catch {
        Pause-OnError "Could not install Node.js automatically.`n      Please download it from https://nodejs.org and re-run setup."
    }
}

# ─── Step 2: Find PostgreSQL ─────────────────────────────────────────────────

Write-Step "2/6" "Locating PostgreSQL..."

$pgBin  = $null
$pgData = $null

# Search common installation paths (newest first)
$candidates = @(
    "C:\Program Files\PostgreSQL\18",
    "C:\Program Files\PostgreSQL\17",
    "C:\Program Files\PostgreSQL\16",
    "C:\Program Files\PostgreSQL\15"
)

foreach ($base in $candidates) {
    if (Test-Path "$base\bin\psql.exe") {
        $pgBin  = "$base\bin"
        $pgData = "$base\data"
        Write-OK "PostgreSQL found: $base"
        break
    }
}

if (-not $pgBin) {
    Write-Warn "PostgreSQL not found - installing via winget (this takes 2-3 minutes)..."
    try {
        $null = winget install PostgreSQL.PostgreSQL.17 `
            --silent `
            --accept-package-agreements `
            --accept-source-agreements 2>&1

        # Reload PATH
        $machinePath = [System.Environment]::GetEnvironmentVariable("PATH","Machine")
        $userPath    = [System.Environment]::GetEnvironmentVariable("PATH","User")
        $env:PATH    = "$machinePath;$userPath"

        foreach ($base in $candidates) {
            if (Test-Path "$base\bin\psql.exe") {
                $pgBin  = "$base\bin"
                $pgData = "$base\data"
                break
            }
        }

        if (-not $pgBin) { throw "Could not locate PostgreSQL binaries after install" }
        Write-OK "PostgreSQL installed successfully"
    }
    catch {
        Pause-OnError "Could not install PostgreSQL automatically.`n      Please download it from https://www.postgresql.org/download/windows/ and re-run setup."
    }
}

# Add pg bin to PATH for this session
$env:PATH = "$pgBin;$env:PATH"

# ─── Step 3: Start PostgreSQL & detect port ───────────────────────────────────

Write-Step "3/6" "Starting PostgreSQL server..."

# Read port from postmaster.pid (most reliable source)
$pgPort = "5432"  # default fallback
$pidFile = "$pgData\postmaster.pid"

if (Test-Path $pidFile) {
    $pidLines = Get-Content $pidFile
    if ($pidLines.Count -ge 4) {
        $pgPort = $pidLines[3].Trim()
        Write-OK "Detected port: $pgPort"
    }
}

# Check if Postgres is already accepting connections
$pgRunning = $false
try {
    $out = & "$pgBin\pg_isready.exe" -h localhost -p $pgPort 2>&1
    if ($LASTEXITCODE -eq 0) { $pgRunning = $true }
} catch {}

if (-not $pgRunning) {
    Write-Warn "PostgreSQL not running - attempting to start..."

    # Try Windows service first
    $svc = Get-Service | Where-Object {
        $_.Name -like "*postgresql*" -or $_.DisplayName -like "*postgresql*"
    } | Select-Object -First 1

    if ($svc) {
        try {
            Start-Service $svc.Name -ErrorAction Stop   # explicit Stop so catch triggers
            Start-Sleep -Seconds 4
            $out = & "$pgBin\pg_isready.exe" -h localhost -p $pgPort 2>&1
            if ($LASTEXITCODE -eq 0) { $pgRunning = $true }
            Write-OK "Service '$($svc.Name)' started"
        } catch {
            Write-Warn "Could not start service: $_"
        }
    }

    # Try pg_ctl directly
    if (-not $pgRunning -and (Test-Path "$pgData\PG_VERSION")) {
        $logDir = "$pgData\log"
        if (-not (Test-Path $logDir)) { New-Item -ItemType Directory $logDir | Out-Null }

        try {
            $null = & "$pgBin\pg_ctl.exe" start -D $pgData -l "$logDir\startup.log" -w -t 30 2>&1
            $out = & "$pgBin\pg_isready.exe" -h localhost -p $pgPort 2>&1
            if ($LASTEXITCODE -eq 0) { $pgRunning = $true }
            Write-OK "PostgreSQL started via pg_ctl"
        } catch {
            Write-Warn "pg_ctl start failed: $_"
        }
    }

    if (-not $pgRunning) {
        Pause-OnError "PostgreSQL could not be started.`n      Please start it from Windows Services and re-run setup."
    }
} else {
    Write-OK "PostgreSQL is running on port $pgPort"
}

# ─── Step 4: Database credentials & connection test ───────────────────────────

Write-Step "4/6" "Connecting to database..."

# Try to reuse existing .env password first
$pgPass = $null
$envFile = "$ProjectDir\.env"

if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw
    if ($envContent -match 'postgres:([^@]+)@') {
        $pgPass = $Matches[1]
        # Test it silently
        $env:PGPASSWORD = $pgPass
        $out = & "$pgBin\pg_isready.exe" -h localhost -p $pgPort -U postgres 2>&1
        $testOut = & "$pgBin\psql.exe" -h localhost -p $pgPort -U postgres -c "\q" 2>&1
        if ($LASTEXITCODE -ne 0) { $pgPass = $null }
    }
}

# Prompt for password if we don't have a working one
if (-not $pgPass) {
    Write-Host ""
    Write-Host "      Enter the password for your PostgreSQL 'postgres' user." -ForegroundColor White
    Write-Host "      (This is the password you chose when installing PostgreSQL)" -ForegroundColor Gray
    Write-Host ""

    $attempts = 0
    while ($attempts -lt 3) {
        $secPass = Read-Host -Prompt "      Password" -AsSecureString
        $pgPass  = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
                       [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secPass))

        $env:PGPASSWORD = $pgPass
        $testOut = & "$pgBin\psql.exe" -h localhost -p $pgPort -U postgres -c "\q" 2>&1
        if ($LASTEXITCODE -eq 0) { break }

        $attempts++
        if ($attempts -lt 3) {
            Write-Warn "Incorrect password. Please try again. ($attempts/3)"
        } else {
            Pause-OnError "Could not connect to PostgreSQL after 3 attempts.`n      Please verify your PostgreSQL password and re-run setup."
        }
    }
}

Write-OK "Database connection verified"

# ─── Create database if it doesn't exist ─────────────────────────────────────

$dbName = "jewellery_erp"
$env:PGPASSWORD = $pgPass

$dbExists = & "$pgBin\psql.exe" -h localhost -p $pgPort -U postgres `
    -tAc "SELECT 1 FROM pg_database WHERE datname='$dbName';" 2>$null

if ($dbExists -ne "1") {
    $null = & "$pgBin\psql.exe" -h localhost -p $pgPort -U postgres `
        -c "CREATE DATABASE $dbName ENCODING 'UTF8';" 2>&1
    Write-OK "Database '$dbName' created"
} else {
    Write-OK "Database '$dbName' already exists"
}

# ─── Step 5: Install app & configure ─────────────────────────────────────────

Write-Step "5/6" "Installing application..."

Set-Location $ProjectDir

# Write .env
$crypto  = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$bytes   = New-Object byte[] 32
$crypto.GetBytes($bytes)
$secret  = ($bytes | ForEach-Object { $_.ToString("x2") }) -join ""

$envContent = @"
DATABASE_URL="postgresql://postgres:$pgPass@localhost:$pgPort/$dbName"
SESSION_SECRET="$secret"
NODE_ENV="development"
"@

Set-Content -Path "$ProjectDir\.env" -Value $envContent -Encoding UTF8
Write-OK ".env configured"

# Expose DATABASE_URL to child processes (prisma.config.ts reads it from env)
$env:DATABASE_URL = "postgresql://postgres:$pgPass@localhost:$pgPort/$dbName"

# npm install
Write-Host "      Installing packages (this may take a few minutes)..." -ForegroundColor Gray
cmd /c "npm install --prefer-offline" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Warn "npm install had warnings (usually safe to ignore)"
}
Write-OK "npm packages installed"

# Prisma generate — run via cmd to avoid PowerShell NativeCommandError on stderr
Write-Host "      Preparing database client..." -ForegroundColor Gray
$genOut = cmd /c "npx prisma generate 2>&1"
if ($LASTEXITCODE -ne 0) {
    Pause-OnError "Prisma generate failed:`n$genOut"
}
Write-OK "Prisma client generated"

# Prisma migrate — DATABASE_URL must be in environment (prisma.config.ts requires it)
Write-Host "      Applying database schema..." -ForegroundColor Gray
$migOut = cmd /c "set DATABASE_URL=$($env:DATABASE_URL) && npx prisma migrate deploy 2>&1"
if ($LASTEXITCODE -ne 0) {
    Pause-OnError "Database migration failed:`n$migOut"
}
Write-OK "Database schema applied"

# ─── Step 6: Create launcher files ───────────────────────────────────────────

Write-Step "6/6" "Creating launcher..."

# start.bat
$startBat = @"
@echo off
title Jewellery ERP
cd /d "$ProjectDir"

echo.
echo  Starting Jewellery ERP...
echo  Please wait - this takes about 10 seconds on first launch.
echo.

:: Start Next.js in the background
start /b "" cmd /c "npm run dev > "%TEMP%\jewellery-erp.log" 2>&1"

:: Wait for the server to be ready
echo  Waiting for server...
:WAIT
timeout /t 2 /nobreak >nul
powershell -NoProfile -Command "try { (Invoke-WebRequest http://localhost:3000 -UseBasicParsing -TimeoutSec 1).StatusCode } catch { exit 1 }" >nul 2>&1
if errorlevel 1 goto WAIT

:: Open browser
echo  Server ready! Opening browser...
start http://localhost:3000

echo.
echo  Jewellery ERP is running at http://localhost:3000
echo  Close this window to STOP the server.
echo.
echo  Press Ctrl+C or close this window to stop.

:: Keep the window open (killing it stops the server)
:KEEP
timeout /t 60 /nobreak >nul
goto KEEP
"@

Set-Content -Path "$ProjectDir\start.bat" -Value $startBat -Encoding ASCII
Write-OK "start.bat created"

# Desktop shortcut
try {
    $icoPath  = "$ProjectDir\resources\icon.ico"
    $WshShell = New-Object -ComObject WScript.Shell
    $shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\Akhtar Jewellers ERP.lnk")
    $shortcut.TargetPath       = "$ProjectDir\start.bat"
    $shortcut.WorkingDirectory = $ProjectDir
    $shortcut.Description      = "Akhtar Jewellers ERP - Business Management System"
    $shortcut.WindowStyle      = 1
    if (Test-Path $icoPath) {
        $shortcut.IconLocation = "$icoPath,0"
    }
    $shortcut.Save()
    Write-OK "Desktop shortcut created with custom icon"
} catch {
    Write-Warn "Could not create desktop shortcut (non-critical): $_"
}

# ─── Done ────────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "  ============================================" -ForegroundColor Green
Write-Host "         Setup Complete!                      " -ForegroundColor Green
Write-Host "  ============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  How to start the app:" -ForegroundColor White
Write-Host "    Double-click 'Jewellery ERP' on your Desktop" -ForegroundColor Cyan
Write-Host "    OR run:  start.bat" -ForegroundColor Cyan
Write-Host "    OR run:  npm run dev  (then open http://localhost:3000)" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Database details saved to .env" -ForegroundColor Gray
Write-Host ""

$launch = Read-Host "  Launch the app now? (Y/N)"
if ($launch -match "^[Yy]") {
    Start-Process "$ProjectDir\start.bat"
}

Write-Host ""
