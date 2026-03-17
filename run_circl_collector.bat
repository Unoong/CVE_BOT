@echo off
chcp 65001 > nul
setlocal

echo ==========================================
echo   CIRCL CVE 수집기 실행
echo ==========================================
echo.
echo 📡 CIRCL Vulnerability-Lookup API에서
echo    최신 CVE 정보를 수집합니다.
echo.
echo 출처: https://vulnerability.circl.lu
echo 형식: CSAF 2.0
echo ==========================================
echo.

cd /d E:\LLama\pythonProject\CVE_BOT

REM 100개 CSAF 문서 수집 (기본값)
python circl_cve_collector.py --limit 100

echo.
echo ==========================================
echo   수집 완료!
echo ==========================================
echo.
echo 📊 로그 파일: logs\circl_collector_*.log
echo.

pause

