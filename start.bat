@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is required. Install a supported Node LTS release, then try again.
  pause
  exit /b 1
)
node scripts\start.mjs %*
set "SYMBIO_EXIT=%ERRORLEVEL%"
if not "%SYMBIO_EXIT%"=="0" pause
exit /b %SYMBIO_EXIT%
