@echo off
chcp 65001 >nul
echo ========================================
echo   www.ai-platform.store:3000 접속 안 될 때 진단
echo ========================================
echo.

echo [1] DNS: www.ai-platform.store 가 어느 IP로 잡히는지
nslookup www.ai-platform.store
echo.

echo [2] 이 PC의 내부 IP (같은 공유기 안에서는 이 주소로 접속 가능)
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do echo    %%a
echo.

echo [3] 공인 IP (외부에서 접속할 때 사용, 포트포워딩 대상)
powershell -NoProfile -Command "try { (Invoke-WebRequest -Uri 'https://api.ipify.org' -UseBasicParsing -TimeoutSec 5).Content } catch { '확인 실패' }"
echo.

echo ========================================
echo   원인 정리
echo ========================================
echo   - 같은 공유기 안(집/사무실)에서 www.ai-platform.store:3000 으로 접속하면
echo     도메인은 공인 IP로 풀리고, 많은 공유기는 "내부-^>공인IP" 접속을
echo     다시 내부로 돌려주지 않아서(NAT 루프백 미지원) 실패합니다.
echo   - 그래서 "IP로만 접속된다" = 내부 IP(192.168.x.x:3000)로만 되는 경우가 많습니다.
echo.
echo   해결 방법:
echo   1) 같은 네트워크 안에서는 192.168.45.244:3000 처럼 내부 IP로 접속
echo   2) 외부(휴대폰 4G 등)에서 https://www.ai-platform.store:3000 접속 테스트
echo   3) 공유기에서 NAT 루프백(헤어핀 NAT) 지원하면 해당 기능 켜기
echo   4) 내부용 DNS: 공유기/PC에서 www.ai-platform.store 를 192.168.45.244 로 풀리게 설정
echo ========================================
pause
