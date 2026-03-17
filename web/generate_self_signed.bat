@echo off
chcp 65001 >nul
cls
echo ========================================
echo   Self-Signed SSL Certificate
echo   (Test/Development Only)
echo ========================================
echo.

cd /d E:\LLama\pythonProject\CVE_BOT\web

echo Checking OpenSSL...
where openssl >nul 2>&1
if %errorLevel% neq 0 (
    echo ❌ OpenSSL not found!
    echo.
    echo Install OpenSSL:
    echo 1. Download: https://slproweb.com/products/Win32OpenSSL.html
    echo 2. Install Win64 OpenSSL (not Light version)
    echo 3. Add to PATH: C:\Program Files\OpenSSL-Win64\bin
    echo.
    pause
    exit /b 1
)

echo ✅ OpenSSL found
echo.

echo Generating self-signed certificate (10 years validity)...
echo.

REM 기존 인증서 백업
if exist server.key (
    echo Backing up existing server.key...
    copy server.key server.key.backup.%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2% >nul 2>&1
)
if exist server.cert (
    echo Backing up existing server.cert...
    copy server.cert server.cert.backup.%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2% >nul 2>&1
)
echo.

REM 10년(3650일) 유효기간으로 인증서 생성
openssl req -x509 -newkey rsa:4096 -keyout server.key -out server.cert -days 3650 -nodes -subj "/C=KR/ST=Seoul/L=Seoul/O=AI Platform/OU=Security/CN=www.ai-platform.store/emailAddress=admin@ai-platform.store"

if %errorLevel% neq 0 (
    echo.
    echo ❌ Certificate generation failed!
    pause
    exit /b 1
)

echo.
echo ✅ Certificate generated!
echo.
echo Files created:
echo   - server.key (Private Key)
echo   - server.cert (Certificate)
echo.
echo Certificate Details:
echo   - Validity: 10 years (3650 days)
echo   - Domain: www.ai-platform.store
echo   - Key Size: RSA 4096 bits
echo.
echo ⚠️  WARNING: This is a self-signed certificate!
echo    Browsers will show security warnings.
echo    Use Let's Encrypt for production.
echo.
echo Start server:
echo   node server.js
echo.
echo Access:
echo   https://www.ai-platform.store:32578
echo.
pause

