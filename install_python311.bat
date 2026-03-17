@echo off
chcp 65001 >nul
setlocal

REM Python 3.11 curl 다운로드 및 설치
REM 1. curl로 다운로드
REM 2. 설치 실행 (기존 Python 제거는 수동으로 설정 > 앱에서 제거)
REM 3. requirements.txt 설치

set "PYTHON_URL=https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe"
set "INSTALLER=%TEMP%\python-3.11.9-amd64.exe"
set "REQ_FILE=C:\aiserver\requirements.txt"

echo ========================================
echo   Python 3.11 설치 (curl 다운로드)
echo ========================================
echo.
echo [1/3] Python 3.11.9 다운로드 중...
curl -L -o "%INSTALLER%" "%PYTHON_URL%"
if %ERRORLEVEL% NEQ 0 (
    echo [오류] 다운로드 실패. curl 확인 또는 URL 확인.
    pause
    goto :eof
)
echo       다운로드 완료: %INSTALLER%
echo.

echo [2/3] Python 3.11 설치 중 (PATH 추가, 관리자 권한 필요할 수 있음)...
"%INSTALLER%" /quiet InstallAllUsers=1 PrependPath=1 Include_test=0
if %ERRORLEVEL% NEQ 0 (
    echo [경고] 설치 종료 코드: %ERRORLEVEL%
    echo        수동 설치: "%INSTALLER%" 실행 후 "Add Python to PATH" 체크
)
echo       설치 완료. 새 CMD 창을 열어 PATH가 반영됩니다.
echo.

REM PATH 갱신 (현재 세션)
set "PATH=C:\Program Files\Python311;C:\Program Files\Python311\Scripts;%PATH%"
set "PATH=%LOCALAPPDATA%\Programs\Python\Python311;%LOCALAPPDATA%\Programs\Python\Python311\Scripts;%PATH%"

echo [3/3] requirements.txt 설치 중...
if not exist "%REQ_FILE%" (
    echo [오류] %REQ_FILE% 파일이 없습니다.
    pause
    goto :eof
)

REM 새로 설치된 Python 3.11의 pip 사용 (경로 확인)
where py -q 2>nul
if %ERRORLEVEL% EQU 0 (
    py -3.11 -m pip install --upgrade pip
    py -3.11 -m pip install -r "%REQ_FILE%"
) else (
    "C:\Program Files\Python311\python.exe" -m pip install --upgrade pip 2>nul
    if exist "C:\Program Files\Python311\python.exe" (
        "C:\Program Files\Python311\python.exe" -m pip install -r "%REQ_FILE%"
    ) else (
        "C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python311\python.exe" -m pip install --upgrade pip 2>nul
        "C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python311\python.exe" -m pip install -r "%REQ_FILE%"
    )
)

echo.
echo ========================================
echo   완료
echo ========================================
echo   - Python 3.11 설치됨
echo   - C:\aiserver\requirements.txt 패키지 설치됨
echo   - 새 터미널에서: python --version
echo ========================================
pause
