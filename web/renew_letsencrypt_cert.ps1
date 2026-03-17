# Let's Encrypt 인증서 발급/갱신 스크립트
# 관리자 권한으로 실행 필요

# UTF-8 인코딩 설정
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# 관리자 권한 확인
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "[ERROR] This script requires Administrator privileges." -ForegroundColor Red
    Write-Host "Please run PowerShell as Administrator and try again." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To run as Administrator:" -ForegroundColor Cyan
    Write-Host "  1. Right-click PowerShell" -ForegroundColor White
    Write-Host "  2. Select 'Run as Administrator'" -ForegroundColor White
    Write-Host "  3. Run this script again" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Let's Encrypt Certificate Issue/Renew" -ForegroundColor Cyan
Write-Host "  Domain: www.ai-platform.store" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$certbotPath = "C:\Users\TOTORO123\AppData\Roaming\Python\Python313\Scripts\certbot.exe"

if (-not (Test-Path $certbotPath)) {
    Write-Host "[ERROR] Certbot not found: $certbotPath" -ForegroundColor Red
    Write-Host "Installing certbot..." -ForegroundColor Yellow
    C:\Python313\python.exe -m pip install certbot
    $certbotPath = "C:\Users\TOTORO123\AppData\Roaming\Python\Python313\Scripts\certbot.exe"
}

Write-Host "[OK] Certbot found: $certbotPath" -ForegroundColor Green
Write-Host ""

# 포트 80 확인
Write-Host "Checking port 80..." -ForegroundColor Yellow
$port80 = Get-NetTCPConnection -LocalPort 80 -ErrorAction SilentlyContinue
if ($port80) {
    Write-Host "  [WARNING] Port 80 is in use!" -ForegroundColor Yellow
    Write-Host "  Processes using port 80:" -ForegroundColor Yellow
    $port80 | ForEach-Object {
        $proc = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host "    - PID $($_.OwningProcess): $($proc.ProcessName)" -ForegroundColor Cyan
        }
    }
    Write-Host ""
    Write-Host "  Please stop the web server before continuing." -ForegroundColor Yellow
    Write-Host ""
    $response = Read-Host "Continue anyway? (y/N)"
    if ($response -ne "y" -and $response -ne "Y") {
        exit 1
    }
} else {
    Write-Host "  [OK] Port 80 is available" -ForegroundColor Green
}
Write-Host ""

# 인증서 발급/갱신
Write-Host "Issuing/Renewing Let's Encrypt certificate..." -ForegroundColor Yellow
Write-Host ""

& $certbotPath certonly --standalone `
    -d www.ai-platform.store `
    -d ai-platform.store `
    --non-interactive `
    --agree-tos `
    --email admin@ai-platform.store `
    --force-renewal

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[OK] Certificate issued/renewed successfully!" -ForegroundColor Green
    Write-Host ""
    
    # 인증서 적용
    Write-Host "Applying certificate..." -ForegroundColor Yellow
    Set-Location "E:\LLama\pythonProject\CVE_BOT\web"
    node apply_ssl.js
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "[OK] Certificate applied successfully!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "  1. Restart web server: pm2 restart all" -ForegroundColor White
        Write-Host "  2. Test: https://www.ai-platform.store:3000" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host "[ERROR] Failed to apply certificate" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host ""
    Write-Host "[ERROR] Certificate issue/renewal failed!" -ForegroundColor Red
    Write-Host "Exit code: $LASTEXITCODE" -ForegroundColor Red
    exit 1
}
