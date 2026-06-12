# ─────────────────────────────────────────────────────────────────
#  Akhtar Jewellers ERP — One-command database setup (Windows)
#  Usage:  .\setup-db.ps1
# ─────────────────────────────────────────────────────────────────

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Akhtar Jewellers ERP — Database Setup              ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# 1. Check Docker is running
Write-Host "▶  Checking Docker..." -ForegroundColor Yellow
try {
    docker info | Out-Null
    Write-Host "✅  Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌  Docker is not running. Please start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}

# 2. Start PostgreSQL container
Write-Host "▶  Starting PostgreSQL container..." -ForegroundColor Yellow
docker-compose up -d
Write-Host "✅  Container started" -ForegroundColor Green

# 3. Wait for Postgres to be ready
Write-Host "▶  Waiting for Postgres to be ready..." -ForegroundColor Yellow
$maxAttempts = 20
$attempt = 0
do {
    Start-Sleep -Seconds 2
    $attempt++
    $ready = docker exec jewel_erp_db pg_isready -U jewel_user -d jewel_erp 2>$null
    if ($LASTEXITCODE -eq 0) { break }
    Write-Host "   Still waiting... ($attempt/$maxAttempts)" -ForegroundColor DarkGray
} while ($attempt -lt $maxAttempts)

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌  Postgres did not become ready in time." -ForegroundColor Red
    exit 1
}
Write-Host "✅  Postgres is ready" -ForegroundColor Green

# 4. Run Prisma migrations
Write-Host "▶  Running Prisma migrations..." -ForegroundColor Yellow
Set-Location $ProjectRoot
npx prisma migrate deploy
Write-Host "✅  Migrations applied" -ForegroundColor Green

# 5. Generate Prisma client
Write-Host "▶  Generating Prisma client..." -ForegroundColor Yellow
npx prisma generate
Write-Host "✅  Prisma client generated" -ForegroundColor Green

# 6. Seed the database
Write-Host "▶  Seeding database with demo data..." -ForegroundColor Yellow
node prisma/seed.js
Write-Host "✅  Database seeded" -ForegroundColor Green

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   ✅  Setup complete!                                 ║" -ForegroundColor Green
Write-Host "║                                                      ║" -ForegroundColor Green
Write-Host "║   Run:  npm run dev                                  ║" -ForegroundColor Green
Write-Host "║   Open: http://localhost:3000                        ║" -ForegroundColor Green
Write-Host "║                                                      ║" -ForegroundColor Green
Write-Host "║   DB Studio: npx prisma studio                      ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
