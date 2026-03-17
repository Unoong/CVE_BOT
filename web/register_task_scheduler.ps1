# ==========================================
# Windows 작업 스케줄러 자동 등록 스크립트
# 매일 오전 3시에 대시보드 통계 갱신
# ==========================================

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Windows Scheduler Register Start..." -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan

# Check Admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: Admin required!" -ForegroundColor Red
    Write-Host "Please run PowerShell as Administrator" -ForegroundColor Yellow
    pause
    exit 1
}

$taskName = "CVE_Dashboard_Stats_Update"

# Remove existing task
try {
    $existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if ($existingTask) {
        Write-Host "Remove existing task..." -ForegroundColor Yellow
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
        Write-Host "Existing task removed" -ForegroundColor Green
    }
} catch {
    # Ignore
}

$batchPath = "E:\LLama\pythonProject\CVE_BOT\web\update_dashboard_stats.bat"

if (-not (Test-Path $batchPath)) {
    Write-Host "ERROR: Batch file not found!" -ForegroundColor Red
    Write-Host "Path: $batchPath" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "Batch file found: $batchPath" -ForegroundColor Green

try {
    # Trigger: Daily at 3:00 AM
    $trigger = New-ScheduledTaskTrigger -Daily -At 3:00AM
    
    # Action: Run batch file
    $action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$batchPath`""
    
    # Principal: SYSTEM account
    $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
    
    # Settings
    $settings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -StartWhenAvailable `
        -RunOnlyIfNetworkAvailable:$false `
        -DontStopOnIdleEnd `
        -MultipleInstances IgnoreNew
    
    # Register task
    Register-ScheduledTask `
        -TaskName $taskName `
        -Trigger $trigger `
        -Action $action `
        -Principal $principal `
        -Settings $settings `
        -Description "CVE Dashboard stats auto-update daily at 3:00 AM" | Out-Null
    
    Write-Host "Task registered successfully!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "Task Information:" -ForegroundColor Yellow
    Write-Host "   Task Name: $taskName" -ForegroundColor White
    Write-Host "   Schedule: Daily at 3:00 AM" -ForegroundColor White
    Write-Host "   Batch File: $batchPath" -ForegroundColor White
    Write-Host "   Account: SYSTEM" -ForegroundColor White
    Write-Host "==========================================" -ForegroundColor Cyan
    
    # Check task status
    $task = Get-ScheduledTask -TaskName $taskName
    Write-Host "Task Status: $($task.State)" -ForegroundColor Green
    
    # Next run time
    $nextRun = (Get-ScheduledTaskInfo -TaskName $taskName).NextRunTime
    if ($nextRun) {
        Write-Host "Next Run: $nextRun" -ForegroundColor Cyan
    }
    
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "How to manage:" -ForegroundColor Yellow
    Write-Host "   1. Open Task Scheduler: taskschd.msc" -ForegroundColor White
    Write-Host "   2. Manual run: Right-click task -> Run" -ForegroundColor White
    Write-Host "   3. Delete task: Unregister-ScheduledTask -TaskName $taskName" -ForegroundColor White
    Write-Host "==========================================" -ForegroundColor Cyan
    
    Write-Host "Test run now? (Y/N): " -ForegroundColor Yellow -NoNewline
    $response = Read-Host
    
    if ($response -eq "Y" -or $response -eq "y") {
        Write-Host "Running test..." -ForegroundColor Cyan
        Start-ScheduledTask -TaskName $taskName
        Start-Sleep -Seconds 3
        
        $taskInfo = Get-ScheduledTaskInfo -TaskName $taskName
        Write-Host "Last Run: $($taskInfo.LastRunTime)" -ForegroundColor Green
        Write-Host "Result Code: $($taskInfo.LastTaskResult)" -ForegroundColor Green
        
        if ($taskInfo.LastTaskResult -eq 0) {
            Write-Host "Test Success!" -ForegroundColor Green
        } else {
            Write-Host "Error Code: $($taskInfo.LastTaskResult)" -ForegroundColor Yellow
        }
    }
    
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "Setup Complete!" -ForegroundColor Green
    
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    pause
    exit 1
}

pause
