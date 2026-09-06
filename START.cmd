@echo off
cd /d "%~dp0"
where node >nul 2>nul
if %errorlevel% neq 0 (
  echo Install Node.js 22 or newer, then run npm ci in this folder.
  pause
  exit /b 1
)
if not exist node_modules\esbuild (
  echo Run npm ci in this folder first.
  pause
  exit /b 1
)
node scripts/build.mjs
if errorlevel 1 exit /b 1
node server.mjs
pause
