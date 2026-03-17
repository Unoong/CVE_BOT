# Let's Encrypt 인증서 갱신 스크립트
# PowerShell 관리자 권한으로 실행

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Let's Encrypt 인증서 갱신" -ForegroundColor Cyan
Write-Host "  도메인: www.ai-platform.store" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$webDir = "E:\LLama\pythonProject\CVE_BOT\web"
$certPath = "C:\Certbot\live\www.ai-platform.store"

# 1. Certbot 설치 확인
Write-Host "1️⃣ Certbot 설치 확인 중..." -ForegroundColor Yellow

$certbotPath = $null
$possiblePaths = @(
    "C:\Program Files\Certbot\certbot.exe",
    "C:\Python*\Scripts\certbot.exe",
    "$env:LOCALAPPDATA\Programs\Python\Python*\Scripts\certbot.exe"
)

foreach ($path in $possiblePaths) {
    $found = Get-ChildItem $path -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) {
        $certbotPath = $found.FullName
        break
    }
}

if (-not $certbotPath) {
    Write-Host "   ❌ Certbot이 설치되어 있지 않습니다." -ForegroundColor Red
    Write-Host ""
    Write-Host "   Certbot 설치 방법:" -ForegroundColor Yellow
    Write-Host "   1. Winget 사용: winget install certbot" -ForegroundColor Cyan
    Write-Host "   2. Chocolatey 사용: choco install certbot" -ForegroundColor Cyan
    Write-Host "   3. 공식 사이트: https://github.com/certbot/certbot/releases" -ForegroundColor Cyan
    Write-Host ""
    Read-Host "설치 후 Enter를 누르세요"
    
    # 재확인
    foreach ($path in $possiblePaths) {
        $found = Get-ChildItem $path -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($found) {
            $certbotPath = $found.FullName
            break
        }
    }
    
    if (-not $certbotPath) {
        Write-Host "   ❌ Certbot을 찾을 수 없습니다." -ForegroundColor Red
        exit 1
    }
}

Write-Host "   ✅ Certbot 발견: $certbotPath" -ForegroundColor Green
Write-Host ""

# 2. 포트 80 확인
Write-Host "2️⃣ 포트 80 사용 확인 중..." -ForegroundColor Yellow

$port80 = Get-NetTCPConnection -LocalPort 80 -ErrorAction SilentlyContinue
if ($port80) {
    Write-Host "   ⚠️  포트 80이 사용 중입니다!" -ForegroundColor Red
    Write-Host "   Node.js 웹 서버를 먼저 중지하세요" -ForegroundColor Red
    Write-Host ""
    Read-Host "중지 후 Enter를 누르세요"
} else {
    Write-Host "   ✅ 포트 80 사용 가능" -ForegroundColor Green
}
Write-Host ""

# 3. 인증서 갱신
Write-Host "3️⃣ Let's Encrypt 인증서 갱신 중..." -ForegroundColor Yellow
Write-Host ""

# 갱신 가능 여부 확인
Write-Host "   갱신 가능 여부 확인 중..." -ForegroundColor Cyan
& $certbotPath renew --dry-run

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "   ✅ 갱신 가능합니다. 실제 갱신을 진행합니다..." -ForegroundColor Green
    Write-Host ""
    
    # 실제 갱신 (만료 30일 전부터 가능, 강제 갱신은 --force-renewal)
    & $certbotPath renew --force-renewal
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "   ✅ 인증서 갱신 완료!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "   ❌ 인증서 갱신 실패!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host ""
    Write-Host "   ⚠️  갱신이 필요하지 않거나 오류가 발생했습니다." -ForegroundColor Yellow
    Write-Host "   강제 갱신을 시도합니다..." -ForegroundColor Yellow
    Write-Host ""
    
    & $certbotPath certonly --standalone --force-renewal -d www.ai-platform.store -d ai-platform.store
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "   ✅ 인증서 재발급 완료!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "   ❌ 인증서 재발급 실패!" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# 4. 인증서 적용
Write-Host "4️⃣ 인증서 적용 중..." -ForegroundColor Yellow
Write-Host ""

Set-Location $webDir
node apply_ssl.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
    Write-Host "✅ Let's Encrypt 인증서 갱신 및 적용 완료!" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
    Write-Host ""
    Write-Host "🚀 다음 단계:" -ForegroundColor Cyan
    Write-Host "   1. 웹 서버 재시작: node server.js" -ForegroundColor White
    Write-Host "   2. HTTPS 접속 테스트: https://www.ai-platform.store:32578" -ForegroundColor White
    Write-Host ""
    Write-Host "🔄 자동 갱신 설정:" -ForegroundColor Cyan
    Write-Host "   - Windows 작업 스케줄러에 등록" -ForegroundColor White
    Write-Host "   - 명령어: certbot renew --quiet" -ForegroundColor White
    Write-Host "   - 실행 주기: 매월 1일 03:00 AM" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "   ❌ 인증서 적용 실패!" -ForegroundColor Red
    Write-Host "   수동으로 apply_ssl.js를 실행하세요" -ForegroundColor Yellow
    exit 1
}
