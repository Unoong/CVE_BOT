@echo off
chcp 65001 >nul
echo ================================================================================
echo 🔄 CVE Bot 웹서버 완전 재시작
echo ================================================================================
echo.

echo 🛑 기존 Node.js 프로세스 종료 중...
taskkill /F /IM node.exe 2>nul
if %errorlevel% equ 0 (
    echo    ✅ 기존 프로세스 종료 완료
) else (
    echo    ℹ️  실행 중인 프로세스가 없습니다
)

echo.
echo ⏳ 3초 대기 중...
timeout /t 3 /nobreak >nul

echo.
echo 📍 백엔드 서버 시작 중 (포트 32577)...
start "CVE Bot - Backend Server" cmd /k "cd /d %~dp0 && node server.js"
timeout /t 3 /nobreak >nul

echo 📍 프론트엔드 서버 시작 중 (포트 3000)...
start "CVE Bot - Frontend Server" cmd /k "cd /d %~dp0client && npm run dev"

echo.
echo ✅ 서버 재시작 완료!
echo.
echo ================================================================================
echo 📌 접속 정보
echo ================================================================================
echo 🌐 프론트엔드: http://localhost:3000
echo 🔧 백엔드 API: http://localhost:32577
echo 🔐 기본 관리자: ID=admin, PW=admin1234
echo.
echo ================================================================================
echo 💡 중요: 브라우저에서 Ctrl + Shift + R (강제 새로고침) 을 눌러주세요!
echo ================================================================================
echo.
echo 🌐 5초 후 브라우저가 열립니다...
timeout /t 5 /nobreak >nul
start http://localhost:3000

echo.
echo 💡 서버를 중지하려면 stop.bat을 실행하거나 각 CMD 창에서 Ctrl+C를 누르세요
echo.
pause

