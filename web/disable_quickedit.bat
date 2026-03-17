@echo off
echo ========================================
echo   QuickEdit Mode 비활성화
echo ========================================
echo.

echo CMD 창 클릭 시 멈춤 현상을 방지합니다.
echo.

REM 현재 사용자의 Console 레지스트리 설정 변경
reg add HKCU\Console /v QuickEdit /t REG_DWORD /d 0 /f

if %errorLevel% equ 0 (
    echo ✅ QuickEdit Mode가 비활성화되었습니다.
    echo.
    echo 새 CMD 창부터 적용됩니다.
    echo 기존 실행 중인 CMD는 다시 시작하세요.
) else (
    echo ❌ 레지스트리 수정 실패
    echo 관리자 권한으로 실행하세요.
)

echo.
echo 다시 활성화하려면:
echo    reg add HKCU\Console /v QuickEdit /t REG_DWORD /d 1 /f
echo.
pause

