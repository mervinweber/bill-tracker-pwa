@echo off
setlocal
set "SCRIPT=%~dp0Fix-Lowes-Login.ps1"

if not exist "%SCRIPT%" (
  echo [edge-reauth] Could not find Fix-Lowes-Login.ps1 next to this file.
  pause
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%"
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo [edge-reauth] Script ended with error code %EXIT_CODE%.
  pause
  exit /b %EXIT_CODE%
)

powershell.exe -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('Done. Please reopen Edge and sign in again.','Fix Lowes Login')" >nul 2>&1

exit /b 0
