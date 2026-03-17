@echo off
REM CVE Bot 서버 상태 모니터링 및 필요 시 재시작 스크립트

chcp 65001 >nul

REM ================= 환경 설정 =================
set "WEB_ROOT=E:\LLama\pythonProject\CVE_BOT\web"
set "CLIENT_ROOT=%WEB_ROOT%\client"
set "BACKEND_HTTP_PORT=32577"
set "BACKEND_HTTPS_PORT=32578"
set "FRONTEND_PORT=3000"
REM =============================================

echo ========================================
echo   CVE Bot 서버 모니터링 실행
echo ========================================

REM 포트 상태 확인
call :is_port_listening %BACKEND_HTTP_PORT%
set "BACKEND_HTTP_OK=%ERRORLEVEL%"

call :is_port_listening %BACKEND_HTTPS_PORT%
set "BACKEND_HTTPS_OK=%ERRORLEVEL%"

call :is_port_listening %FRONTEND_PORT%
set "FRONTEND_OK=%ERRORLEVEL%"

echo 백엔드 HTTP (%BACKEND_HTTP_PORT%) 상태: %BACKEND_HTTP_OK%  (0: LISTENING, 1: 비정상)
echo 백엔드 HTTPS (%BACKEND_HTTPS_PORT%) 상태: %BACKEND_HTTPS_OK%
echo 프론트엔드 (%FRONTEND_PORT%) 상태: %FRONTEND_OK%

REM 세 포트가 모두 LISTENING(정상: 0)이면 아무 것도 하지 않고 종료
if "%BACKEND_HTTP_OK%"=="0" if "%BACKEND_HTTPS_OK%"=="0" if "%FRONTEND_OK%"=="0" (
    echo.
    echo 모든 서버가 정상 동작 중입니다. 재시작하지 않습니다.
    goto :eof
)

echo.
echo 하나 이상이 멈춰있거나 비정상입니다. 전체 서버를 재시작합니다. (pm2 기반)

REM PM 모드 수동 실행 스크립트 호출 (내부에서 pm2로 백/프론트 재시작 및 로그 관리)
echo [PM] 서버실행.bat 를 호출해서 PM 모드로 서버를 재시작합니다...
call "%WEB_ROOT%\서버실행.bat"

echo.
echo 서버 재시작 요청(서버실행.bat 호출)이 완료되었습니다.
goto :eof


REM ================= 포트 LISTENING 여부 체크 함수 ================
:is_port_listening
set "PORT=%1"
if "%PORT%"=="" (
    REM 포트가 없으면 비정상 취급
    exit /b 1
)

REM LISTENING 상태가 있으면 정상(0), 없으면 비정상(1)
netstat -ano | find ":%PORT% " | find "LISTENING" >nul 2>&1
if %ERRORLEVEL%==0 (
    exit /b 0
)
exit /b 1


REM (pm2 기반으로 변경하면서, 포트 기준 강제 종료 함수는 더 이상 사용하지 않음)
