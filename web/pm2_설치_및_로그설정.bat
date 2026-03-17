@echo off
REM pm2 및 pm2-logrotate 설치 및 로그 로테이션 설정 스크립트

chcp 65001 >nul

echo ========================================
echo   pm2 / pm2-logrotate 설치 및 설정
echo ========================================
echo.
echo 1) pm2, pm2-logrotate 글로벌 설치
echo 2) pm2-logrotate 설정: max_size=10M, retain=10
echo.

REM pm2 / pm2-logrotate 설치
npm install -g pm2 pm2-logrotate

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] pm2 또는 pm2-logrotate 설치 중 오류가 발생했습니다.
    echo        관리자 권한 CMD 또는 PowerShell에서 다시 실행해 보세요.
    echo.
    pause
    goto :eof
)

REM pm2-logrotate 모듈 등록
pm2 install pm2-logrotate

REM 로그 로테이션 설정: 10MB, 10개 보관
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 10

echo.
echo [OK] pm2 및 로그 로테이션 설정이 완료되었습니다.
echo     - 로그 파일은 10MB를 넘으면 자동으로 회전되며
echo       최대 10개까지 보관됩니다.
echo.
echo 이제 '서버실행.bat'로 PM 모드 서버를 실행할 수 있습니다.
echo.
pause


