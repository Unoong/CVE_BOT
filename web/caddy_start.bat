@echo off
chcp 65001 >nul
REM Caddy 실행 - ds-aiplatform.com SSL (Let's Encrypt 자동 발급)
REM 실행 전: pm2로 백엔드(32577), 프론트엔드(3001) 먼저 실행

cd /d "%~dp0"

echo ========================================
echo   Caddy SSL 리버스프록시 실행
echo   https://ds-aiplatform.com:3000
echo ========================================
echo.

where caddy >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Caddy가 설치되어 있지 않습니다.
    echo         winget install Caddy.Caddy
    echo         또는 https://caddyserver.com/download
    pause
    goto :eof
)

if not exist "..\logs" mkdir "..\logs"

echo [Caddy] Caddyfile 기준으로 실행 중...
echo         (Ctrl+C로 종료)
echo.
caddy run --config Caddyfile
