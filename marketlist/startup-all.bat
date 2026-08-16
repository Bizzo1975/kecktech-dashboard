@echo off
title Marketlist - Development Startup
echo ========================================
echo    MARKETLIST DEVELOPMENT STARTUP
echo ========================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    pause
    exit /b 1
)

if not exist "package.json" (
    echo ERROR: Run this script from the project root
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo Installing workspace dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: npm install failed
        pause
        exit /b 1
    )
)

if not exist "packages\shared\dist" (
    echo Building shared package...
    npm run build:shared
)

if not exist ".env" (
    echo WARNING: .env not found. Create one with DB_* JWT_SECRET PORT before API will work.
)

echo.
echo Starting API (port 3000) and Expo mobile...
echo Docs: http://localhost:3000/api/docs
echo Health: http://localhost:3000/api/health
echo.
echo In another terminal for web: npm run dev -w @marketlist/web
echo.

start "Marketlist API" cmd /k npm run dev:api
timeout /t 3 /nobreak >nul
start "Marketlist Mobile" cmd /k npm run dev:mobile

echo Launched API and Expo windows.
pause
