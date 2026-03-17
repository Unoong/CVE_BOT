@echo off
chcp 65001 >nul
echo ================================================================================
echo 🚀 CVE Bot 웹서버 시작
echo ================================================================================
echo.
echo 📍 백엔드 서버를 시작합니다 (포트 32577)...
start "CVE Bot - Backend Server" cmd /k "cd /d %~dp0 && node server.js"
timeout /t 3 /nobreak >nul

echo 📍 프론트엔드 서버를 시작합니다 (포트 3000)...
start "CVE Bot - Frontend Server" cmd /k "cd /d %~dp0client && npm run dev"

echo.
echo ✅ 서버가 시작되었습니다!
echo.
echo 📌 백엔드: http://localhost:32577
echo 📌 프론트엔드: http://localhost:3000
echo 📌 기본 관리자: ID=admin, PW=admin1234
echo.
echo 🌐 5초 후 브라우저가 열립니다...
echo.
timeout /t 5 /nobreak >nul
start http://localhost:3000

echo ================================================================================
echo 💡 서버를 중지하려면 각 CMD 창에서 Ctrl+C를 누르세요
echo ================================================================================
pause

