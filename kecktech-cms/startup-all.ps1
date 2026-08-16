# Startup script for Kecktech IT Service & Support Website
# This script starts all necessary services for development

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Kecktech Website Development Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Node.js is not installed or not in PATH" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Navigate to script directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Check if package.json exists
if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: package.json not found. Make sure you're in the website directory." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[1/5] Checking dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to install dependencies" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
} else {
    Write-Host "Dependencies already installed." -ForegroundColor Green
}

Write-Host ""
Write-Host "[2/5] Generating Prisma Client..." -ForegroundColor Yellow
npm run db:generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Failed to generate Prisma Client" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[3/5] Setting up database..." -ForegroundColor Yellow
npm run db:push
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Database setup may have issues" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[4/5] Creating admin user..." -ForegroundColor Yellow
npm run db:create-admin
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Admin user creation may have failed, but continuing..." -ForegroundColor Yellow
} else {
    Write-Host "Admin user ready!" -ForegroundColor Green
}

Write-Host ""
Write-Host "[5/5] Starting development server..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Server starting at http://localhost:3021" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "IMPORTANT LINKS:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Website:        http://localhost:3021" -ForegroundColor Green
Write-Host "Admin Login:    http://localhost:3021/admin/login" -ForegroundColor Cyan
Write-Host ""
Write-Host "Default Admin Credentials:" -ForegroundColor Yellow
Write-Host "  Email:    admin@kecktech.com" -ForegroundColor White
Write-Host "  Password: admin123" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

npm run dev
