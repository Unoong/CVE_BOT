@echo off
chcp 65001 >nul
echo Caddy 설치 (winget 없이 - Invoke-WebRequest 사용)
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0caddy_설치.ps1"
echo.
pause
