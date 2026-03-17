# win-acme 자동 설치 및 SSL 인증서 발급 스크립트
# PowerShell 관리자 권한으로 실행

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  win-acme SSL 인증서 발급" -ForegroundColor Cyan
Write-Host "  도메인: www.ai-platform.store" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 작업 디렉토리
$webDir = "E:\LLama\pythonProject\CVE_BOT\web"
$winAcmeDir = Join-Path $webDir "win-acme"

# 1. win-acme 다운로드
Write-Host "1️⃣ win-acme 다운로드 중..." -ForegroundColor Yellow
$downloadUrl = "https://github.com/win-acme/win-acme/releases/download/v2.2.9/win-acme.v2.2.9.1701.x64.pluggable.zip"
$zipPath = Join-Path $webDir "win-acme.zip"

try {
    Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath -UseBasicParsing
    Write-Host "   ✅ 다운로드 완료" -ForegroundColor Green
} catch {
    Write-Host "   ❌ 다운로드 실패: $_" -ForegroundColor Red
    exit 1
}

# 2. 압축 해제
Write-Host ""
Write-Host "2️⃣ 압축 해제 중..." -ForegroundColor Yellow

if (Test-Path $winAcmeDir) {
    Remove-Item $winAcmeDir -Recurse -Force
}

Expand-Archive -Path $zipPath -DestinationPath $winAcmeDir -Force
Write-Host "   ✅ 압축 해제 완료" -ForegroundColor Green

# 3. 웹 서버 중지 확인
Write-Host ""
Write-Host "3️⃣ 포트 80 사용 확인..." -ForegroundColor Yellow

$port80 = Get-NetTCPConnection -LocalPort 80 -ErrorAction SilentlyContinue
if ($port80) {
    Write-Host "   ⚠️  포트 80이 사용 중입니다!" -ForegroundColor Red
    Write-Host "   Node.js 웹 서버를 먼저 중지하세요 (Ctrl+C)" -ForegroundColor Red
    Write-Host ""
    Read-Host "중지 후 Enter를 누르세요"
}

Write-Host "   ✅ 포트 80 사용 가능" -ForegroundColor Green

# 4. 인증서 발급
Write-Host ""
Write-Host "4️⃣ SSL 인증서 발급 중..." -ForegroundColor Yellow
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "다음 선택을 하세요:" -ForegroundColor Cyan
Write-Host "1. N - Create certificate (new)" -ForegroundColor Yellow
Write-Host "2. 4 - Manually input host names" -ForegroundColor Yellow
Write-Host "3. 입력: www.ai-platform.store,ai-platform.store" -ForegroundColor Yellow
Write-Host "4. 2 - [http-01] Self-hosting" -ForegroundColor Yellow
Write-Host "5. 2 - RSA key" -ForegroundColor Yellow
Write-Host "6. 2 - PEM encoded files (Apache, nginx, etc.)" -ForegroundColor Yellow
Write-Host "7. 경로: $webDir" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

Set-Location $winAcmeDir
.\wacs.exe

# 5. 인증서 파일 이름 변경
Write-Host ""
Write-Host "5️⃣ 인증서 파일 적용 중..." -ForegroundColor Yellow

$keyFile = Get-ChildItem -Path $webDir -Filter "*-key.pem" | Select-Object -First 1
$chainFile = Get-ChildItem -Path $webDir -Filter "*-chain.pem" | Select-Object -First 1

if ($keyFile) {
    Copy-Item $keyFile.FullName -Destination (Join-Path $webDir "server.key") -Force
    Write-Host "   ✅ server.key 생성" -ForegroundColor Green
} else {
    Write-Host "   ❌ 개인키 파일을 찾을 수 없습니다" -ForegroundColor Red
}

if ($chainFile) {
    Copy-Item $chainFile.FullName -Destination (Join-Path $webDir "server.cert") -Force
    Write-Host "   ✅ server.cert 생성" -ForegroundColor Green
} else {
    Write-Host "   ❌ 인증서 파일을 찾을 수 없습니다" -ForegroundColor Red
}

# 6. 완료
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ SSL 인증서 설정 완료!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "🚀 서버 시작:" -ForegroundColor Yellow
Write-Host "   cd E:\LLama\pythonProject\CVE_BOT\web" -ForegroundColor White
Write-Host "   node server.js" -ForegroundColor White
Write-Host ""
Write-Host "🌐 HTTPS 접속:" -ForegroundColor Yellow
Write-Host "   https://www.ai-platform.store:32578" -ForegroundColor White
Write-Host ""

Read-Host "Press Enter to exit"

