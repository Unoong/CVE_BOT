@echo off
chcp 65001 >nul
REM Caddy Let's Encrypt 인증서 갱신
REM - Caddy는 만료 30일 전 자동 갱신하지만, 수동 확인/갱신 트리거용

set "WEB_ROOT=%~dp0"
if "%WEB_ROOT:~-1%"=="\" set "WEB_ROOT=%WEB_ROOT:~0,-1%"
if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
if exist "%APPDATA%\npm" set "PATH=%APPDATA%\npm;%PATH%"
if exist "%WEB_ROOT%\caddy.exe" set "PATH=%WEB_ROOT%;%PATH%"

echo ========================================
echo   Caddy Let's Encrypt 인증서 갱신
echo ========================================
echo.

REM 인증서 경로
echo [인증서 경로]
echo   기본 데이터: %APPDATA%\Caddy
echo.
echo   Let's Encrypt (www.ds-aiplatform.com):
echo   %APPDATA%\Caddy\certificates\acme-v02.api.letsencrypt.org-directory\www.ds-aiplatform.com\
echo     - www.ds-aiplatform.com.crt  (인증서)
echo     - www.ds-aiplatform.com.key  (개인키)
echo     - www.ds-aiplatform.com.json (메타데이터)
echo.
echo   localhost (자체 서명):
echo   %APPDATA%\Caddy\certificates\local\localhost\
echo.
echo   ACME 계정:
echo   %APPDATA%\Caddy\acme\acme-v02.api.letsencrypt.org-directory\
echo.
echo ========================================
echo.

REM Caddy 재시작 → 인증서 만료 확인 및 갱신 트리거
echo [갱신] Caddy 재시작 중... (인증서 만료 30일 이내 시 자동 갱신)
pm2 restart caddy
if %ERRORLEVEL% NEQ 0 (
    echo [오류] pm2 restart 실패. Caddy가 pm2로 실행 중인지 확인하세요.
    pause
    goto :eof
)

echo.
echo [완료] Caddy 재시작됨. 갱신 필요 시 Caddy가 자동으로 처리합니다.
echo        로그: pm2 logs caddy
echo.
echo [작업 스케줄러] 월 1회 자동 갱신 등록 (관리자 CMD):
echo   schtasks /create /tn "Caddy인증서갱신" /tr "\"%WEB_ROOT%\인증서_갱신.bat\"" /sc monthly /d 1 /st 03:00
echo.
if "%~1"=="/s" goto :eof
pause
