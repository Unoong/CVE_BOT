@echo off
chcp 65001 > nul
echo ========================================
echo Windows CMD QuickEdit 모드 비활성화
echo ========================================
echo.
echo 이 스크립트는 CMD 창에서 마우스 클릭 시
echo 프로그램이 멈추는 문제를 해결합니다.
echo.
echo 변경 사항은 새로운 CMD 창부터 적용됩니다.
echo.

:: 레지스트리 수정 (QuickEdit 모드 비활성화)
reg add "HKCU\Console" /v QuickEdit /t REG_DWORD /d 0 /f >nul 2>nul

if %ERRORLEVEL% EQU 0 (
    echo ✅ QuickEdit 모드가 비활성화되었습니다.
    echo.
    echo 📌 적용 방법:
    echo    1. 현재 CMD 창을 모두 닫으세요
    echo    2. 새로운 CMD 창을 여세요
    echo    3. 이제 마우스 클릭해도 멈추지 않습니다
) else (
    echo ❌ 권한이 부족합니다. 관리자 권한으로 실행해주세요.
)

echo.
pause

