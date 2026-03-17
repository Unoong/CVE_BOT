@echo off
cd /d "%~dp0"
set LOG=%~dp0logs
if not exist "%LOG%" mkdir "%LOG%"
echo [%date% %time%] 시작 >> "%LOG%\init_dashboard.log"
node init_dashboard_stats.js >> "%LOG%\init_dashboard.log" 2>&1
if errorlevel 1 (
  echo [ERROR] init_dashboard_stats.js 실패 >> "%LOG%\init_dashboard.log"
  exit /b 1
)
echo [%date% %time%] 완료 >> "%LOG%\init_dashboard.log"
exit /b 0
