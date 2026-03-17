@echo off
chcp 65001 >nul
REM Let's Encrypt 인증서 자동 갱신 배치 파일
REM Windows 작업 스케줄러에서 실행 가능

cd /d E:\LLama\pythonProject\CVE_BOT\web

PowerShell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0auto_renew_ssl.ps1"

if %errorLevel% neq 0 (
    echo.
    echo ❌ 인증서 갱신 실패!
    pause
    exit /b 1
)

exit /b 0
