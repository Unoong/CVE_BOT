# Let's Encrypt 인증서 자동 갱신 작업 스케줄러 등록 스크립트
# PowerShell 관리자 권한으로 실행

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
Write-Host "  SSL Certificate Auto Renewal Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$scriptPath = "E:\LLama\pythonProject\CVE_BOT\web\auto_renew_ssl.ps1"
$taskName = "CVE_BOT_SSL_AutoRenew"
$taskDescription = "Let's Encrypt SSL 인증서 자동 갱신 (만료 30일 전부터)"

# 1. 스크립트 경로 확인
if (-not (Test-Path $scriptPath)) {
    Write-Host "[ERROR] Script not found: $scriptPath" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Script found: $scriptPath" -ForegroundColor Green
Write-Host ""

# 2. 기존 작업 삭제 (있는 경우)
Write-Host "2. Checking existing task..." -ForegroundColor Yellow

$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "   Existing task found. Removing..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "   [OK] Existing task removed" -ForegroundColor Green
} else {
    Write-Host "   [OK] No existing task" -ForegroundColor Green
}
Write-Host ""

# 3. 새 작업 생성
Write-Host "3. Creating new task..." -ForegroundColor Yellow

$action = New-ScheduledTaskAction -Execute "PowerShell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`"" `
    -WorkingDirectory "E:\LLama\pythonProject\CVE_BOT\web"

# 매주 월요일 오전 3시에 실행
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 3am

# 관리자 권한으로 실행
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

# 설정
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Hours 1)

try {
    Register-ScheduledTask `
        -TaskName $taskName `
        -Action $action `
        -Trigger $trigger `
        -Principal $principal `
        -Settings $settings `
        -Description $taskDescription `
        -Force
    
    Write-Host "   [OK] Task registered successfully!" -ForegroundColor Green
    Write-Host ""
    
    # 작업 정보 표시
    Start-Sleep -Seconds 1
    $task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if ($task) {
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "[OK] Auto renewal task registered!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Task Information:" -ForegroundColor Cyan
        Write-Host "  Name: $taskName" -ForegroundColor White
        Write-Host "  Description: $taskDescription" -ForegroundColor White
        Write-Host "  Schedule: Every Monday at 3:00 AM" -ForegroundColor White
        Write-Host "  Run As: SYSTEM (Highest privileges)" -ForegroundColor White
        Write-Host "  State: $($task.State)" -ForegroundColor White
        Write-Host ""
        Write-Host "Manual Execution:" -ForegroundColor Cyan
        Write-Host "  PowerShell: .\auto_renew_ssl.ps1" -ForegroundColor White
        Write-Host "  Task Scheduler: $taskName" -ForegroundColor White
        Write-Host ""
        Write-Host "Check Task:" -ForegroundColor Cyan
        Write-Host "  Get-ScheduledTask -TaskName `"$taskName`"" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host "[WARNING] Task may not be registered properly." -ForegroundColor Yellow
        Write-Host "Please check Task Scheduler manually." -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "   [ERROR] Task registration failed: $_" -ForegroundColor Red
    Write-Host "   Error details: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please ensure:" -ForegroundColor Yellow
    Write-Host "  1. Running as Administrator" -ForegroundColor White
    Write-Host "  2. Task Scheduler service is running" -ForegroundColor White
    Write-Host "  3. No conflicting task exists" -ForegroundColor White
    Write-Host ""
    exit 1
}
