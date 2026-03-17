# Caddy 설치 스크립트 (winget 없이 - AWS 등 환경용)
# 실행: powershell -ExecutionPolicy Bypass -File caddy_설치.ps1

$ErrorActionPreference = "Stop"
$CADDY_VER = "2.11.2"
$URL = "https://github.com/caddyserver/caddy/releases/download/v$CADDY_VER/caddy_${CADDY_VER}_windows_amd64.zip"
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$ZIP = Join-Path $SCRIPT_DIR "caddy_temp.zip"

Write-Host "========================================"
Write-Host "  Caddy v$CADDY_VER 설치 (Invoke-WebRequest)"
Write-Host "========================================"
Write-Host ""

# 기존 Caddy 프로세스 중지 (pm2)
try {
    pm2 stop caddy 2>$null
    Start-Sleep -Seconds 2
} catch {}

# 다운로드
Write-Host "[1] 다운로드 중: $URL"
Invoke-WebRequest -Uri $URL -OutFile $ZIP -UseBasicParsing

# 압축 해제
Write-Host "[2] 압축 해제 중..."
Expand-Archive -Path $ZIP -DestinationPath $SCRIPT_DIR -Force

# 임시 파일 삭제
Remove-Item $ZIP -Force -ErrorAction SilentlyContinue

# 확인
$exe = Join-Path $SCRIPT_DIR "caddy.exe"
if (Test-Path $exe) {
    $ver = & $exe version 2>$null
    Write-Host "[3] 설치 완료: $exe"
    Write-Host "    버전: $ver"
} else {
    Write-Host "[3] 오류: caddy.exe를 찾을 수 없습니다."
    exit 1
}

# [4] 사용자 PATH에 Caddy 경로 추가 (선택)
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$SCRIPT_DIR*") {
    Write-Host ""
    Write-Host "[4] 사용자 PATH에 Caddy 경로 추가 중..."
    [Environment]::SetEnvironmentVariable("Path", "$SCRIPT_DIR;$userPath", "User")
    Write-Host "    완료. 새 터미널에서 'caddy' 명령 사용 가능."
} else {
    Write-Host "[4] PATH에 이미 등록됨."
}

Write-Host ""
Write-Host "서버실행.bat을 실행하여 Caddy를 포함해 전체 서비스를 시작하세요."
