@echo off
REM CVE Bot 서버 PM(pm2) 모드 실행 스크립트
REM - CMD 창을 실수로 닫아도 pm2가 서버 프로세스를 유지/관리
REM - 로그는 pm2-logrotate로 10MB, 최대 10개까지 로테이션

chcp 65001 >nul
cls

REM ================= 환경 설정 (배치 파일 위치 기준) =================
set "WEB_ROOT=%~dp0"
if "%WEB_ROOT:~-1%"=="\" set "WEB_ROOT=%WEB_ROOT:~0,-1%"

REM Node·pm2·Caddy 경로 추가 (스케줄러/부팅 시 PATH 없을 수 있음)
if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "PATH=%ProgramFiles(x86)%\nodejs;%PATH%"
if exist "%APPDATA%\npm" set "PATH=%APPDATA%\npm;%PATH%"
if exist "%WEB_ROOT%\caddy.exe" set "PATH=%WEB_ROOT%;%PATH%"
for %%I in ("%WEB_ROOT%\..") do set "PROJECT_ROOT=%%~fI"
set "PM2_CONFIG=%WEB_ROOT%\ecosystem.config.js"
REM =============================================

echo ========================================
echo   CVE Bot 취약점관리서버 실행 (pm2)
echo ========================================
echo.
echo   - 백엔드(32577) / 프론트엔드(3001) / Caddy(3000) 자동 실행
echo   - 접속: https://localhost:3000 또는 https://ds-aiplatform.com:3000
echo   - 이 CMD 창을 닫아도 서버는 계속 동작합니다.
echo   - 로그: %PROJECT_ROOT%\logs\
echo.

REM pm2 존재 여부 확인
where pm2 >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] pm2가 설치되어 있지 않습니다.
    echo         먼저 "pm2_설치_및_로그설정.bat" 를 관리자 권한으로 실행해 주세요.
    echo.
    pause
    goto :eof
)

REM pm2 설정 파일 존재 확인
if not exist "%PM2_CONFIG%" (
    echo [ERROR] pm2 설정 파일을 찾을 수 없습니다.
    echo         경로: %PM2_CONFIG%
    echo.
    pause
    goto :eof
)

REM 로그 디렉터리 존재 여부 확인 후 없으면 생성
if not exist "%PROJECT_ROOT%\logs" (
    mkdir "%PROJECT_ROOT%\logs"
)

REM pm2로 서버 앱들 시작/재시작
cd /d "%WEB_ROOT%"

REM 백엔드(32577,32578)·프론트(3001)·Caddy(3000) 포트 사용 프로세스 종료
echo [정리] 포트 3000, 3001, 32577, 32578 사용 프로세스 종료 중...
for %%P in (3000 3001 32577 32578) do (
  for /f "tokens=5" %%A in ('netstat -ano 2^>nul ^| findstr ":%%P " ^| findstr "LISTENING"') do taskkill /PID %%A /F >nul 2^>^&1
)
ping 127.0.0.1 -n 3 >nul

echo [pm2] 기존 프로세스 정리...
call pm2 delete cve-bot-server 2>nul
call pm2 delete cve-backend cve-frontend caddy 2>nul

REM Caddy 실행 (caddy.exe 또는 PATH에 caddy 있으면 실행)
set "CADDY_OK=0"
if exist "%WEB_ROOT%\caddy.exe" set "CADDY_OK=1"
where caddy >nul 2>&1
if %ERRORLEVEL% EQU 0 set "CADDY_OK=1"
if %CADDY_OK% EQU 1 (
    echo [pm2] 백엔드 + 프론트엔드 + Caddy 실행 중...
    pm2 start "%PM2_CONFIG%"
) else (
    echo [경고] Caddy 없음 - 백엔드/프론트엔드만 실행 (접속: http://localhost:3001)
    pm2 start "%PM2_CONFIG%" --only cve-backend,cve-frontend
)

REM 현재 프로세스 상태 출력
echo.
pm2 status cve-backend cve-frontend caddy 2>nul
if %ERRORLEVEL% NEQ 0 pm2 status cve-backend cve-frontend

REM 현재 pm2 프로세스 목록 저장 (재부팅 후 복원용)
pm2 save

REM pm2 startup 설정 (시스템 재부팅 시 자동 시작)
echo.
echo [pm2] 시스템 재부팅 시 자동 시작 설정...
pm2 startup | findstr /C:"pm2 startup" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo       자동 시작 설정이 완료되었습니다.
) else (
    echo       자동 시작 설정을 확인하세요.
)

echo.
echo ========================================
echo   pm2를 통한 서버 실행 요청이 완료되었습니다.
echo   이 창을 닫아도 서버는 계속 동작합니다.
echo   (중단/재시작은 pm2 명령으로 관리하세요)
echo ========================================
echo.
echo   주요 명령 예시:
echo     pm2 status
echo     pm2 restart all
echo     pm2 logs cve-backend
echo.
if "%~1"=="" pause
goto :eof
