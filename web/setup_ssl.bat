@echo off
chcp 65001 >nul
echo ========================================
echo   SSL 인증서 설정 가이드
echo   도메인: www.ai-platform.store
echo ========================================
echo.
echo 이 스크립트는 Let's Encrypt SSL 인증서 발급을 도와줍니다.
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 📋 사전 요구사항:
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo 1. 도메인 DNS 설정:
echo    - A 레코드: www.ai-platform.store → 서버 공인 IP
echo    - (선택) A 레코드: ai-platform.store → 서버 공인 IP
echo.
echo 2. 방화벽 설정:
echo    - 포트 80 (HTTP) 열기
echo    - 포트 443 (HTTPS) 열기
echo    - 포트 32577 (기존 HTTP) 열기  
echo    - 포트 32578 (기존 HTTPS) 열기
echo.
echo 3. 서버가 공인 IP에서 접근 가능해야 함
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 🔧 Certbot 설치 방법:
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo Windows에서 Certbot 설치:
echo 1. https://github.com/certbot/certbot/releases 방문
echo 2. certbot-beta-installer-win_amd64_signed.exe 다운로드
echo 3. 설치 실행
echo.
echo 또는 Chocolatey 사용:
echo    choco install certbot
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 📜 인증서 발급 명령어:
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo certbot certonly --standalone -d www.ai-platform.store -d ai-platform.store
echo.
echo 또는 웹서버가 실행 중이면:
echo certbot certonly --webroot -w E:\LLama\pythonProject\CVE_BOT\web\client\build -d www.ai-platform.store
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 🔗 인증서 위치 (발급 후):
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo C:\Certbot\live\www.ai-platform.store\privkey.pem   (개인키)
echo C:\Certbot\live\www.ai-platform.store\fullchain.pem (인증서)
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
pause

