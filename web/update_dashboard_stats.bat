@echo off
REM ==========================================
REM 대시보드 통계 자동 갱신 배치 스크립트
REM ==========================================

cd /d E:\LLama\pythonProject\CVE_BOT\web

echo ==========================================
echo 📊 대시보드 통계 갱신 시작...
echo 시간: %date% %time%
echo ==========================================

node init_dashboard_stats.js

echo.
echo ==========================================
echo ✅ 대시보드 통계 갱신 완료!
echo 종료 시간: %date% %time%
echo ==========================================
echo.

REM 로그 파일에 기록
echo [%date% %time%] Dashboard stats updated >> logs\dashboard_update.log

