# 📅 대시보드 통계 자동 갱신 설정 가이드

## 🎯 목적
매일 **오전 3시**에 대시보드 통계를 자동으로 갱신하여 항상 최신 데이터를 유지합니다.

---

## ⚡ 빠른 설정 (2분 소요)

### 1️⃣ PowerShell을 관리자 권한으로 실행

**방법 1: 시작 메뉴에서**
1. `Windows + S` 키를 눌러 검색 열기
2. `PowerShell` 입력
3. **"Windows PowerShell"** 우클릭
4. **"관리자 권한으로 실행"** 클릭

**방법 2: 빠른 실행**
1. `Windows + X` 키 누르기
2. **"Windows PowerShell(관리자)"** 또는 **"터미널(관리자)"** 선택

---

### 2️⃣ 스크립트 실행

PowerShell 창에서 아래 명령어를 **한 줄씩** 복사해서 실행:

```powershell
# 1. 작업 디렉토리로 이동
cd E:\LLama\pythonProject\CVE_BOT\web

# 2. 실행 정책 변경 (최초 1회만)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force

# 3. 작업 스케줄러 등록
.\register_task_scheduler.ps1
```

---

### 3️⃣ 확인 및 테스트

스크립트 실행 후:
1. **"지금 테스트 실행해보시겠습니까? (Y/N):"** 메시지가 나오면 **`Y`** 입력
2. **"✅ 테스트 성공!"** 메시지 확인
3. 완료!

---

## 📋 등록된 작업 정보

- **작업 이름:** `CVE_Dashboard_Stats_Update`
- **실행 시간:** 매일 오전 3시
- **실행 파일:** `update_dashboard_stats.bat`
- **로그 위치:** `E:\LLama\pythonProject\CVE_BOT\web\logs\dashboard_update.log`

---

## 🛠️ 작업 관리

### 작업 스케줄러 열기
```
Windows + R → taskschd.msc 입력 → 확인
```

### 수동으로 즉시 실행
1. 작업 스케줄러에서 `CVE_Dashboard_Stats_Update` 찾기
2. 우클릭 → **"실행"** 클릭

### 작업 삭제
```powershell
Unregister-ScheduledTask -TaskName "CVE_Dashboard_Stats_Update" -Confirm:$false
```

### 수동 갱신 (작업 스케줄러 없이)
```bash
cd E:\LLama\pythonProject\CVE_BOT\web
node init_dashboard_stats.js
```

---

## 🔍 로그 확인

갱신 로그 확인:
```powershell
Get-Content E:\LLama\pythonProject\CVE_BOT\web\logs\dashboard_update.log -Tail 50
```

---

## ❓ 문제 해결

### "이 시스템에서 스크립트를 실행할 수 없습니다" 오류
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
```

### "관리자 권한이 필요합니다" 오류
- PowerShell을 **관리자 권한으로 다시 실행**해야 합니다.

### 작업이 실행되지 않음
1. 작업 스케줄러 열기 (`taskschd.msc`)
2. `CVE_Dashboard_Stats_Update` 우클릭 → **속성**
3. **"트리거"** 탭 확인 → 시간 설정 확인
4. **"기록"** 탭 확인 → 오류 메시지 확인

---

## 📊 갱신 주기 변경

### 오전 3시 → 다른 시간으로 변경
`register_task_scheduler.ps1` 파일에서 아래 줄 수정:
```powershell
# 변경 전
$trigger = New-ScheduledTaskTrigger -Daily -At 3:00AM

# 변경 후 (예: 오전 2시)
$trigger = New-ScheduledTaskTrigger -Daily -At 2:00AM
```

### 하루 2번 실행 (오전 3시, 오후 3시)
```powershell
$trigger1 = New-ScheduledTaskTrigger -Daily -At 3:00AM
$trigger2 = New-ScheduledTaskTrigger -Daily -At 3:00PM
Register-ScheduledTask ... -Trigger @($trigger1, $trigger2) ...
```

---

## ✅ 설정 완료 체크리스트

- [ ] PowerShell 관리자 권한으로 실행
- [ ] `register_task_scheduler.ps1` 스크립트 실행 완료
- [ ] 테스트 실행 성공 (Y 입력)
- [ ] 작업 스케줄러에서 작업 확인
- [ ] 대시보드에서 **"통계 집계: ..."** 표시 확인

---

## 💡 팁

- 갱신 작업은 **10~30초** 정도 소요됩니다.
- 대량의 CVE 추가 후에는 **수동 갱신** 권장
- 서버 재시작 후에도 **자동 갱신은 계속 작동**합니다.

---

**문제가 있으면 로그 파일을 확인하세요!**

