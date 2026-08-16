@echo off
setlocal enabledelayedexpansion

REM ============================================================================
REM Kecktech Website - Startup Script
REM Starts the Next.js development server with proper Prisma setup
REM ============================================================================

echo ========================================
echo Kecktech Website Development Server
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH
    pause
    exit /b 1
)

REM Navigate to script directory
cd /d "%~dp0"
if not exist "package.json" (
    echo ERROR: package.json not found. Make sure you're in the website directory.
    pause
    exit /b 1
)

echo [1/5] Checking dependencies...
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
    echo OK: Dependencies installed
) else (
    echo OK: Dependencies already installed
)

echo.
echo [2/5] Generating Prisma Client...
call npx prisma generate --schema=prisma/schema.prisma
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to generate Prisma Client
    pause
    exit /b 1
)
echo OK: Prisma Client generated

echo.
echo [3/5] Setting up database...
call npx prisma db push --schema=prisma/schema.prisma
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Database setup may have issues
) else (
    echo OK: Database schema synced
)

echo.
echo [4/5] Creating admin user...
call npm run db:create-admin
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Admin user creation may have failed, but continuing...
) else (
    echo OK: Admin user ready
)

echo.
echo [5/5] Starting development server...
echo.
echo ========================================
echo Server starting at http://localhost:3021
echo ========================================
echo.
echo ========================================
echo IMPORTANT LINKS:
echo ========================================
echo.
echo Website:        http://localhost:3021
echo Admin Login:    http://localhost:3021/admin/login
echo.
echo Default Admin Credentials:
echo   Email:    admin@kecktech.com
echo   Password: admin123
echo.
echo ========================================
echo.
echo Press Ctrl+C to stop the server
echo.

call npm run dev

pause
