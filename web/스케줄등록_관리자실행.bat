@echo off
REM CVE Bot - Register auto-start schedule (run this as Admin)
REM ONLOGON = 사용자 로그온 시 실행 (PATH에 Node/pm2 포함됨). ONSTART는 부팅 시 PATH 없어 실패할 수 있음.
chcp 65001 >nul
cd /d "%~dp0"

set "SCRIPT_PATH=%~dp0서버실행.bat"
set "TASK_NAME=CVE_Bot_Server_AutoStart"

schtasks /Query /TN "%TASK_NAME%" >nul 2>&1
if %ERRORLEVEL%==0 (
    schtasks /Delete /TN "%TASK_NAME%" /F
    echo [기존 작업 삭제됨]
)

REM 사용자 로그온 시 실행 (관리자 권한)
schtasks /Create /SC ONLOGON /TN "%TASK_NAME%" /TR "\"%SCRIPT_PATH%\"" /F /RL HIGHEST

if %ERRORLEVEL%==0 (
    echo.
    echo [OK] 스케줄 등록 완료: %TASK_NAME%
    echo      - 사용자가 Windows에 로그인할 때 서버가 자동 실행됩니다.
    echo      - 작업 스케줄러(taskschd.msc)에서 확인/수정 가능합니다.
) else (
    echo [실패] 관리자 권한으로 다시 실행해 주세요.
    echo         우클릭 - "관리자 권한으로 실행"
)
echo.
pause
