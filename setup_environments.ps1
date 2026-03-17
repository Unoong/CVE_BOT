# ==========================================
# 환경 설정 초기화 스크립트
# ==========================================

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "CVE Bot 환경 설정 초기화" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

# 1. 설정 파일 템플릿 생성
Write-Host "`n[1/3] 설정 파일 템플릿 생성..." -ForegroundColor Yellow
python config_loader.py

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 설정 파일 템플릿 생성 실패" -ForegroundColor Red
    exit 1
}

Write-Host "✅ 설정 파일 템플릿 생성 완료" -ForegroundColor Green

# 2. 예제 파일 생성 (Git에 커밋 가능)
Write-Host "`n[2/3] 예제 파일 생성..." -ForegroundColor Yellow

$configTest = Join-Path $ProjectRoot "config.test.json"
$configProd = Join-Path $ProjectRoot "config.prod.json"

if (Test-Path $configTest) {
    Copy-Item $configTest "$configTest.example" -Force
    Write-Host "✅ config.test.json.example 생성" -ForegroundColor Green
}

if (Test-Path $configProd) {
    Copy-Item $configProd "$configProd.example" -Force
    Write-Host "✅ config.prod.json.example 생성" -ForegroundColor Green
}

# 3. 안내 메시지
Write-Host "`n[3/3] 설정 완료!" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "다음 단계:" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "1. config.test.json 파일을 열어서 테스트 환경 설정을 수정하세요" -ForegroundColor White
Write-Host "2. config.prod.json 파일을 열어서 운영 환경 설정을 수정하세요" -ForegroundColor White
Write-Host "3. 환경 변수를 설정하여 환경을 전환하세요:" -ForegroundColor White
Write-Host "   - 테스트: `$env:CVE_BOT_ENV = 'TEST'" -ForegroundColor Gray
Write-Host "   - 운영: `$env:CVE_BOT_ENV = 'PROD'" -ForegroundColor Gray
Write-Host "==========================================" -ForegroundColor Cyan
