@echo off
REM ==========================================
REM CVE 웹 서버 시작 (QuickEdit 비활성화)
REM ==========================================

REM QuickEdit Mode 비활성화 (CMD 멈춤 방지)
reg add HKCU\Console /v QuickEdit /t REG_DWORD /d 0 /f >nul 2>&1

cd /d E:\LLama\pythonProject\CVE_BOT\web

echo ==========================================
echo 🚀 CVE 웹 서버 시작
echo ==========================================
echo ⚠️  QuickEdit Mode 비활성화됨 (CMD 클릭해도 멈추지 않음)
echo 💡 서버 종료: Ctrl+C
echo ==========================================
echo.

node server.js

pause

