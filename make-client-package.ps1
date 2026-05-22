# =============================================================================
#  Akhtar Jewellers ERP - Create Client Distribution Package
#  Run this on YOUR machine to generate a ZIP ready to give to the client.
# =============================================================================

$ErrorActionPreference = "Continue"
$ProjectDir  = $PSScriptRoot
$ProductName = "Akhtar Jewellers ERP"
$ZipName     = "Akhtar-Jewellers-ERP-Setup.zip"
$OutputZip   = "$env:USERPROFILE\Desktop\$ZipName"

Clear-Host
Write-Host ""
Write-Host "  ============================================" -ForegroundColor DarkYellow
Write-Host "   Creating Client Package..." -ForegroundColor Yellow
Write-Host "  ============================================" -ForegroundColor DarkYellow
Write-Host ""

# ─── Files/folders to EXCLUDE from the package ───────────────────────────────
$exclude = @(
    "node_modules",
    ".next",
    ".env",                          # Never share — contains DB password
    ".env.local",
    "*.log",
    "dist",
    "dist-electron",
    ".git",
    "make-client-package.ps1",       # Don't include this script itself
    "pg_password.txt",
    "*.pgdump",
    "seed_*.txt",
    "seed_*.log",
    "test_*.log",
    "output.log"
)

# ─── Build list of files to include ──────────────────────────────────────────

Write-Host "  Collecting files..." -ForegroundColor Cyan

$allItems = Get-ChildItem -Path $ProjectDir -Force

$toInclude = $allItems | Where-Object {
    $name = $_.Name
    $skip = $false
    foreach ($ex in $exclude) {
        if ($name -like $ex) { $skip = $true; break }
    }
    -not $skip
}

# ─── Remove old zip if exists ─────────────────────────────────────────────────

if (Test-Path $OutputZip) {
    Remove-Item $OutputZip -Force
    Write-Host "  Removed old package" -ForegroundColor Gray
}

# ─── Create ZIP ──────────────────────────────────────────────────────────────

Write-Host "  Building ZIP (this takes ~30 seconds)..." -ForegroundColor Cyan

Add-Type -AssemblyName System.IO.Compression.FileSystem

$zip = [System.IO.Compression.ZipFile]::Open($OutputZip, 'Create')

function Add-ToZip($zip, $sourcePath, $entryPrefix) {
    $items = Get-ChildItem -Path $sourcePath -Recurse -Force -File
    foreach ($file in $items) {
        # Skip excluded folders anywhere in the path
        $skip = $false
        foreach ($ex in $exclude) {
            if ($file.FullName -like "*\$ex\*" -or $file.FullName -like "*\$ex") {
                $skip = $true; break
            }
            if ($file.Name -like $ex) { $skip = $true; break }
        }
        if ($skip) { continue }

        $relativePath = $file.FullName.Substring($sourcePath.Length + 1)
        $entryName    = if ($entryPrefix) { "$entryPrefix\$relativePath" } else { $relativePath }
        $entryName    = $entryName.Replace('\', '/')

        try {
            $null = [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
                $zip, $file.FullName, $entryName,
                [System.IO.Compression.CompressionLevel]::Optimal
            )
        } catch {
            # Skip locked/unreadable files silently
        }
    }
}

# Add all project files into a subfolder inside the zip
Add-ToZip $zip $ProjectDir $ProductName

$zip.Dispose()

# ─── Result ──────────────────────────────────────────────────────────────────

$sizeMB = [math]::Round((Get-Item $OutputZip).Length / 1MB, 1)

Write-Host ""
Write-Host "  ============================================" -ForegroundColor Green
Write-Host "   Package Ready!                            " -ForegroundColor Green
Write-Host "  ============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  File:  $OutputZip" -ForegroundColor White
Write-Host "  Size:  $sizeMB MB" -ForegroundColor White
Write-Host ""
Write-Host "  HOW TO GIVE TO CLIENT:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   Option 1 - USB Drive (Recommended)" -ForegroundColor Cyan
Write-Host "     Copy '$ZipName' to a USB drive." -ForegroundColor White
Write-Host "     Client extracts the ZIP, opens the folder," -ForegroundColor White
Write-Host "     and double-clicks 'setup.bat'." -ForegroundColor White
Write-Host ""
Write-Host "   Option 2 - WhatsApp / Google Drive" -ForegroundColor Cyan
Write-Host "     Upload '$ZipName' to Google Drive." -ForegroundColor White
Write-Host "     Share the download link with the client." -ForegroundColor White
Write-Host ""
Write-Host "   CLIENT INSTRUCTIONS (copy-paste to them):" -ForegroundColor Yellow
Write-Host ""
Write-Host "     1. Extract the ZIP file" -ForegroundColor White
Write-Host "     2. Open the extracted folder" -ForegroundColor White
Write-Host "     3. Double-click 'setup.bat'" -ForegroundColor White
Write-Host "     4. Enter your PostgreSQL password when asked" -ForegroundColor White
Write-Host "     5. Wait 3-5 minutes for setup to finish" -ForegroundColor White
Write-Host "     6. A shortcut appears on your Desktop - done!" -ForegroundColor White
Write-Host ""

# Open Desktop so user can find the file easily
explorer.exe $env:USERPROFILE\Desktop
