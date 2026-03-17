@echo off
chcp 65001 > nul
echo ========================================
echo CVE BOT 웹서버 서비스 시작 (백엔드 + 프론트엔드)
echo ========================================

cd /d "%~dp0"

:: PM2가 설치되어 있는지 확인
where pm2 >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [오류] PM2가 설치되어 있지 않습니다.
    echo PM2를 설치합니다...
    npm install -g pm2
    npm install -g pm2-windows-startup
    pm2-startup install
)

:: 로그 폴더 생성
if not exist "..\logs" mkdir "..\logs"

:: 포트 3000 사용 중인 프로세스 종료 (프론트엔드는 반드시 3000 - 포트포워딩 고정)
echo [0] 포트 3000 사용 프로세스 종료 중...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" 2>nul
timeout /t 1 /nobreak >nul

:: 기존 프로세스 중지/삭제 (구 이름 + 새 이름 모두)
echo [1] 기존 서비스 정리 중...
pm2 stop cve-bot-server 2>nul
pm2 delete cve-bot-server 2>nul
pm2 stop cve-backend cve-frontend 2>nul
pm2 delete cve-backend cve-frontend 2>nul

:: ecosystem.config.js 기준으로 백엔드 + 프론트엔드 둘 다 시작
echo [2] 백엔드(32577/32578) + 프론트엔드(3000) 시작 중...
pm2 start ecosystem.config.js

:: 상태 출력
echo.
pm2 status cve-backend cve-frontend

:: 부팅 시 자동 시작 설정
echo [3] 부팅 시 자동 시작 설정...
pm2 save

echo ========================================
echo ✅ 백엔드 + 프론트엔드가 백그라운드에서 실행 중입니다
echo ========================================
echo   - 프론트엔드: http://localhost:3000
echo   - 백엔드 HTTP: http://localhost:32577
echo   - 백엔드 HTTPS: https://localhost:32578
echo.
echo 📊 서버 상태: pm2 status
echo 🔄 재시작: pm2 restart cve-backend cve-frontend
echo 📋 로그: pm2 logs cve-backend / pm2 logs cve-frontend
echo.
pause
