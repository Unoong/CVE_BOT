@echo off
chcp 65001 >nul
echo ================================================================================
echo 🛑 CVE Bot 웹서버 중지
echo ================================================================================
echo.

echo 📍 Node 프로세스를 종료합니다...
taskkill /F /IM node.exe /T >nul 2>&1

if %errorlevel% == 0 (
    echo ✅ 서버가 중지되었습니다!
) else (
    echo ⚠️  실행 중인 Node 프로세스가 없습니다
)

echo.
pause

