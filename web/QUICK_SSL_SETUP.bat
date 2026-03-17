@echo off
chcp 65001 >nul
cls
echo ========================================
echo   SSL 인증서 빠른 설정
echo   도메인: www.ai-platform.store
echo ========================================
echo.

REM 관리자 권한 확인
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ❌ 관리자 권한이 필요합니다!
    echo    우클릭 → "관리자 권한으로 실행"
    pause
    exit /b 1
)

echo ✅ 관리자 권한 확인 완료
echo.

echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 1단계: 방화벽 포트 열기
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

netsh advfirewall firewall delete rule name="HTTP Port 80" >nul 2>&1
netsh advfirewall firewall add rule name="HTTP Port 80" dir=in action=allow protocol=TCP localport=80
echo ✓ 포트 80 (HTTP)

netsh advfirewall firewall delete rule name="HTTPS Port 443" >nul 2>&1
netsh advfirewall firewall add rule name="HTTPS Port 443" dir=in action=allow protocol=TCP localport=443
echo ✓ 포트 443 (HTTPS)

netsh advfirewall firewall delete rule name="CVE Bot HTTP" >nul 2>&1
netsh advfirewall firewall add rule name="CVE Bot HTTP" dir=in action=allow protocol=TCP localport=32577
echo ✓ 포트 32577 (App HTTP)

netsh advfirewall firewall delete rule name="CVE Bot HTTPS" >nul 2>&1
netsh advfirewall firewall add rule name="CVE Bot HTTPS" dir=in action=allow protocol=TCP localport=32578
echo ✓ 포트 32578 (App HTTPS)

echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 2단계: DNS 확인
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

nslookup www.ai-platform.store
echo.

echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 3단계: Certbot 설치 확인
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

where certbot >nul 2>&1
if %errorLevel% neq 0 (
    echo ❌ Certbot이 설치되지 않았습니다!
    echo.
    echo 설치 방법:
    echo 1. https://github.com/certbot/certbot/releases 방문
    echo 2. certbot-beta-installer-win_amd64_signed.exe 다운로드
    echo 3. 설치 실행
    echo.
    echo 또는 Chocolatey:
    echo    choco install certbot -y
    echo.
    pause
    exit /b 1
)

certbot --version
echo ✅ Certbot 설치 확인 완료
echo.

echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 4단계: SSL 인증서 발급
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo 웹 서버를 먼저 중지하세요! (포트 80이 사용 가능해야 함)
echo.
pause
echo.

certbot certonly --standalone -d www.ai-platform.store -d ai-platform.store

if %errorLevel% neq 0 (
    echo.
    echo ❌ 인증서 발급 실패!
    echo.
    echo 문제 해결:
    echo 1. DNS가 올바르게 설정되었는지 확인
    echo 2. 포트 80이 열려있는지 확인
    echo 3. 웹 서버가 중지되었는지 확인
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ 인증서 발급 완료!
echo.

echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 5단계: 인증서 적용
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

node apply_ssl.js

if %errorLevel% neq 0 (
    echo.
    echo ❌ 인증서 적용 실패!
    pause
    exit /b 1
)

echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo ✅ SSL 설정 완료!
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo 🚀 다음 단계:
echo    1. 웹 서버 시작: node server.js
echo    2. HTTPS 접속: https://www.ai-platform.store:32578
echo.
echo 🔄 자동 갱신:
echo    SSL_SETUP_GUIDE.md 의 "7단계: 자동 갱신 설정" 참고
echo.
pause

