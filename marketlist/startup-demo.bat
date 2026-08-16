@echo off
title Marketlist Live Demo (Cloudflare Tunnel)
echo ========================================
echo   MARKETLIST LIVE DEMO
echo ========================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
  echo ERROR: Node.js not found
  pause
  exit /b 1
)

if not exist "package.json" (
  echo ERROR: Run from repo root
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing dependencies...
  npm install
)

if not exist "packages\shared\dist" (
  echo Building shared package...
  npm run build:shared
)

if not exist ".env" (
  echo WARNING: .env missing. Copy .env.example to .env and set DB credentials.
  echo.
)

echo Seeding demo data (demo@marketlist.app / demo12345)...
npm run seed -w @marketlist/api
echo.

echo Starting API on :3000 ...
start "Marketlist API" cmd /k npm run dev:api

timeout /t 4 /nobreak >nul

echo Starting Web on :3001 (proxies /api to API)...
start "Marketlist Web" cmd /k npm run dev:web

timeout /t 5 /nobreak >nul

where cloudflared >nul 2>nul
if %errorlevel% neq 0 (
  echo.
  echo cloudflared not found in PATH.
  echo Install: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
  echo Then re-run this script, or manually:
  echo   cloudflared tunnel --url http://localhost:3001
  echo.
  echo Local demo: http://localhost:3001
  echo Demo login: demo@marketlist.app / demo12345
  pause
  exit /b 0
)

echo.
echo Opening Cloudflare quick tunnel to http://localhost:3001
echo Share the https://*.trycloudflare.com URL that appears below.
echo Demo login: demo@marketlist.app / demo12345
echo.
cloudflared tunnel --url http://localhost:3001

pause
