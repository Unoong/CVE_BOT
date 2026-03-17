# ==========================================
# CVE Bot 배포 스크립트 (PowerShell)
# 테스트 환경에서 검증 후 운영 환경에 배포
# ==========================================

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("test", "prod", "both")]
    [string]$Target = "both",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipTest = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun = $false
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "CVE Bot 배포 스크립트" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan

# 프로젝트 루트 디렉토리
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

# Git 상태 확인
Write-Host "`n[1/5] Git 상태 확인..." -ForegroundColor Yellow
try {
    $gitStatus = git status --porcelain
    if ($gitStatus) {
        Write-Host "⚠️  커밋되지 않은 변경사항이 있습니다:" -ForegroundColor Yellow
        Write-Host $gitStatus -ForegroundColor Gray
        
        if (-not $DryRun) {
            $response = Read-Host "계속 진행하시겠습니까? (y/n)"
            if ($response -ne "y") {
                Write-Host "배포 취소됨" -ForegroundColor Red
                exit 1
            }
        }
    } else {
        Write-Host "✅ Git 상태 정상" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Git이 설치되어 있지 않거나 Git 저장소가 아닙니다" -ForegroundColor Yellow
}

# 환경별 설정 파일 확인
Write-Host "`n[2/5] 환경별 설정 파일 확인..." -ForegroundColor Yellow

$configTest = Join-Path $ProjectRoot "config.test.json"
$configProd = Join-Path $ProjectRoot "config.prod.json"

if (-not (Test-Path $configTest)) {
    Write-Host "❌ config.test.json 파일이 없습니다" -ForegroundColor Red
    Write-Host "   python config_loader.py 를 실행하여 템플릿을 생성하세요" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path $configProd)) {
    Write-Host "❌ config.prod.json 파일이 없습니다" -ForegroundColor Red
    Write-Host "   python config_loader.py 를 실행하여 템플릿을 생성하세요" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ 설정 파일 확인 완료" -ForegroundColor Green

# 테스트 환경 검증
if (-not $SkipTest -and ($Target -eq "test" -or $Target -eq "both")) {
    Write-Host "`n[3/5] 테스트 환경 검증..." -ForegroundColor Yellow
    
    if ($DryRun) {
        Write-Host "[DRY RUN] 테스트 환경 검증 건너뜀" -ForegroundColor Gray
    } else {
        $env:CVE_BOT_ENV = "TEST"
        
        Write-Host "테스트 환경에서 설정 파일 로드 테스트..." -ForegroundColor Gray
        python -c "from config_loader import ConfigLoader; config = ConfigLoader.load_config(); print('✅ 테스트 환경 설정 로드 성공' if config else '❌ 테스트 환경 설정 로드 실패')"
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ 테스트 환경 검증 실패" -ForegroundColor Red
            exit 1
        }
        
        Write-Host "✅ 테스트 환경 검증 완료" -ForegroundColor Green
    }
}

# 운영 환경 배포 준비
if ($Target -eq "prod" -or $Target -eq "both") {
    Write-Host "`n[4/5] 운영 환경 배포 준비..." -ForegroundColor Yellow
    
    if ($DryRun) {
        Write-Host "[DRY RUN] 운영 환경 배포 시뮬레이션" -ForegroundColor Gray
        Write-Host "  - 환경 변수 설정: CVE_BOT_ENV=PROD" -ForegroundColor Gray
        Write-Host "  - config.prod.json 사용" -ForegroundColor Gray
    } else {
        Write-Host "운영 환경 설정 파일 검증..." -ForegroundColor Gray
        $env:CVE_BOT_ENV = "PROD"
        
        python -c "from config_loader import ConfigLoader; config = ConfigLoader.load_config(); print('✅ 운영 환경 설정 로드 성공' if config else '❌ 운영 환경 설정 로드 실패')"
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ 운영 환경 설정 검증 실패" -ForegroundColor Red
            exit 1
        }
        
        Write-Host "✅ 운영 환경 배포 준비 완료" -ForegroundColor Green
    }
}

# 배포 완료
Write-Host "`n[5/5] 배포 완료" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "배포 요약" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan

if ($DryRun) {
    Write-Host "모드: DRY RUN (실제 배포 없음)" -ForegroundColor Gray
} else {
    Write-Host "모드: 실제 배포" -ForegroundColor Green
}

Write-Host "대상: $Target" -ForegroundColor White

if ($Target -eq "test" -or $Target -eq "both") {
    Write-Host "`n테스트 환경 사용법:" -ForegroundColor Yellow
    Write-Host "  `$env:CVE_BOT_ENV = 'TEST'" -ForegroundColor White
    Write-Host "  python main.py" -ForegroundColor White
}

if ($Target -eq "prod" -or $Target -eq "both") {
    Write-Host "`n운영 환경 사용법:" -ForegroundColor Yellow
    Write-Host "  `$env:CVE_BOT_ENV = 'PROD'" -ForegroundColor White
    Write-Host "  python main.py" -ForegroundColor White
}

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "배포 완료!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
