# Let's Encrypt 인증서 자동 갱신 스크립트
# 인증서 만료일을 확인하고, 만료 30일 전부터 자동 갱신
# Windows 작업 스케줄러에 등록하여 정기적으로 실행

param(
    [int]$RenewDaysBeforeExpiry = 30,  # 만료 몇 일 전부터 갱신할지
    [switch]$ForceRenew = $false       # 강제 갱신 여부
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Let's Encrypt 인증서 자동 갱신" -ForegroundColor Cyan
Write-Host "  도메인: www.ai-platform.store" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$webDir = "E:\LLama\pythonProject\CVE_BOT\web"
$certPath = "C:\Certbot\live\www.ai-platform.store\fullchain.pem"
$certbotPath = $null

# 1. Certbot 경로 찾기
Write-Host "1️⃣ Certbot 경로 확인 중..." -ForegroundColor Yellow

$possiblePaths = @(
    "C:\Program Files\Certbot\certbot.exe",
    "C:\Python*\Scripts\certbot.exe",
    "$env:LOCALAPPDATA\Programs\Python\Python*\Scripts\certbot.exe",
    "$env:ProgramFiles\Python*\Scripts\certbot.exe"
)

foreach ($path in $possiblePaths) {
    $found = Get-ChildItem $path -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) {
        $certbotPath = $found.FullName
        break
    }
}

# PATH에서도 찾기
if (-not $certbotPath) {
    try {
        $certbotCmd = Get-Command certbot -ErrorAction Stop
        $certbotPath = $certbotCmd.Source
    } catch {
        # PATH에도 없음
    }
}

if (-not $certbotPath) {
    Write-Host "   ❌ Certbot을 찾을 수 없습니다." -ForegroundColor Red
    Write-Host "   Certbot 설치: winget install EFF.Certbot" -ForegroundColor Yellow
    exit 1
}

Write-Host "   ✅ Certbot 발견: $certbotPath" -ForegroundColor Green
Write-Host ""

# 2. 인증서 파일 확인
Write-Host "2️⃣ 인증서 파일 확인 중..." -ForegroundColor Yellow

if (-not (Test-Path $certPath)) {
    Write-Host "   ❌ 인증서 파일을 찾을 수 없습니다: $certPath" -ForegroundColor Red
    Write-Host "   Let's Encrypt 인증서를 먼저 발급받으세요." -ForegroundColor Yellow
    exit 1
}

Write-Host "   ✅ 인증서 파일 확인: $certPath" -ForegroundColor Green
Write-Host ""

# 3. 인증서 만료일 확인
Write-Host "3️⃣ 인증서 만료일 확인 중..." -ForegroundColor Yellow

try {
    # OpenSSL로 인증서 만료일 확인
    $certInfo = & openssl x509 -in $certPath -noout -enddate 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "OpenSSL 실행 실패"
    }
    
    # notAfter=Jan 11 07:48:00 2036 GMT 형식에서 날짜 추출
    if ($certInfo -match "notAfter=(.+)") {
        $expiryDateStr = $matches[1]
        $expiryDate = [DateTime]::Parse($expiryDateStr)
        $today = Get-Date
        $daysUntilExpiry = ($expiryDate - $today).Days
        
        Write-Host "   인증서 만료일: $($expiryDate.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor Cyan
        Write-Host "   오늘 날짜: $($today.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor Cyan
        Write-Host "   남은 일수: $daysUntilExpiry 일" -ForegroundColor Cyan
        Write-Host ""
        
        # 만료일 체크
        if ($daysUntilExpiry -lt 0) {
            Write-Host "   ⚠️  인증서가 이미 만료되었습니다!" -ForegroundColor Red
            $shouldRenew = $true
        } elseif ($daysUntilExpiry -le $RenewDaysBeforeExpiry -or $ForceRenew) {
            if ($ForceRenew) {
                Write-Host "   🔄 강제 갱신 모드" -ForegroundColor Yellow
            } else {
                Write-Host "   ⚠️  만료일이 $RenewDaysBeforeExpiry 일 이내입니다. 갱신이 필요합니다." -ForegroundColor Yellow
            }
            $shouldRenew = $true
        } else {
            Write-Host "   ✅ 인증서가 아직 유효합니다. 갱신이 필요하지 않습니다." -ForegroundColor Green
            Write-Host "   다음 확인: $($today.AddDays(7).ToString('yyyy-MM-dd'))" -ForegroundColor Cyan
            $shouldRenew = $false
        }
    } else {
        throw "인증서 만료일을 파싱할 수 없습니다"
    }
} catch {
    Write-Host "   ❌ 인증서 정보 확인 실패: $_" -ForegroundColor Red
    Write-Host "   강제 갱신을 시도합니다..." -ForegroundColor Yellow
    $shouldRenew = $true
}

Write-Host ""

# 4. 인증서 갱신
if ($shouldRenew) {
    Write-Host "4️⃣ 인증서 갱신 중..." -ForegroundColor Yellow
    
    # 포트 80 확인
    $port80 = Get-NetTCPConnection -LocalPort 80 -ErrorAction SilentlyContinue
    if ($port80) {
        Write-Host "   ⚠️  포트 80이 사용 중입니다. 웹 서버를 중지해야 합니다." -ForegroundColor Yellow
        Write-Host "   현재 포트 80을 사용하는 프로세스:" -ForegroundColor Yellow
        $port80 | ForEach-Object {
            $proc = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Host "     - PID $($_.OwningProcess): $($proc.ProcessName)" -ForegroundColor Cyan
            }
        }
        Write-Host ""
        Write-Host "   ⚠️  서버를 수동으로 중지한 후 다시 실행하세요." -ForegroundColor Yellow
        Write-Host "   또는 webroot 모드를 사용하세요: certbot certonly --webroot ..." -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "   ✅ 포트 80 사용 가능" -ForegroundColor Green
    Write-Host ""
    
    # 갱신 실행
    if ($ForceRenew) {
        Write-Host "   강제 갱신 실행 중..." -ForegroundColor Cyan
        & $certbotPath certonly --standalone --force-renewal -d www.ai-platform.store -d ai-platform.store --non-interactive --agree-tos
    } else {
        Write-Host "   자동 갱신 실행 중..." -ForegroundColor Cyan
        & $certbotPath renew --non-interactive --quiet
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ 인증서 갱신 완료!" -ForegroundColor Green
    } else {
        Write-Host "   ❌ 인증서 갱신 실패! (종료 코드: $LASTEXITCODE)" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    
    # 5. 인증서 적용
    Write-Host "5️⃣ 인증서 적용 중..." -ForegroundColor Yellow
    
    Set-Location $webDir
    node apply_ssl.js
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ 인증서 적용 완료!" -ForegroundColor Green
    } else {
        Write-Host "   ❌ 인증서 적용 실패!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
    Write-Host "✅ 인증서 갱신 및 적용 완료!" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
    Write-Host ""
    Write-Host "🚀 다음 단계:" -ForegroundColor Cyan
    Write-Host "   웹 서버를 재시작하세요: node server.js" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
    Write-Host "✅ 인증서가 유효합니다. 갱신이 필요하지 않습니다." -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
    Write-Host ""
}
