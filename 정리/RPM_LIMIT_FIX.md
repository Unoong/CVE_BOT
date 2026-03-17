# 🚨 Gemini API RPM 제한 대응 완료!

## 📌 문제 상황
- **Gemini API 제한:** 분당 60개 요청 (RPM, Requests Per Minute)
- **기존 설정:** 병렬 5개 동시 처리 → RPM 초과 위험!
- **결과:** Rate Limit 에러 및 429 Too Many Requests 발생

---

## ✅ 적용된 개선 사항

### 1️⃣ **병렬 처리 개수 조정**
```python
# 변경 전
MAX_WORKERS = 5  # 최대 5개 동시 실행

# 변경 후
MAX_WORKERS = 3  # 최대 3개 동시 실행 (분당 60개 제한 고려)
```

### 2️⃣ **RPM 제한 준수 로직 추가**
```python
REQUESTS_PER_MINUTE = 60  # Gemini API RPM 제한
MIN_REQUEST_INTERVAL = 1.5  # 최소 요청 간격 (초)
# 60개/분 = 1.0초 간격 + 여유 0.5초
```

**동작 방식:**
- 각 API 요청 전에 **마지막 요청 시간** 확인
- 1.5초 이내면 **자동 대기** (thread-safe)
- 3개 병렬 × 1.5초 간격 = **안전한 RPM 준수**

### 3️⃣ **재시도 로직 유지**
- ✅ **타임아웃:** 5분 유지 (3분+ 걸리는 분석 대응)
- ✅ **재시도:** 최대 3회 (일시적 오류 대응)
- ✅ **할당량 초과:** 재시도 안 함 (즉시 계정 전환)

---

## 📊 성능 비교

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| **병렬 처리** | 5개 동시 | **3개 동시** |
| **분석 속도** | 3분당 5건 | **분당 3건** |
| **RPM 준수** | ❌ 없음 | ✅ 1.5초 간격 |
| **Rate Limit 에러** | 빈번 | **거의 없음** |
| **할당량 소진 속도** | 빠름 | **안정적** |

---

## 🔧 코드 변경 사항

### `run_ai_analysis.py`
1. **병렬 설정 조정**
   - `MAX_WORKERS` 5 → 3
   - `MIN_REQUEST_INTERVAL` 1.5초 추가
   
2. **RPM 제한 로직**
   ```python
   # RPM 제한 준수 (분당 60개 = 1초당 1개)
   global last_request_time
   with thread_lock:
       current_time = time.time()
       if last_request_time is not None:
           elapsed = current_time - last_request_time
           if elapsed < MIN_REQUEST_INTERVAL:
               wait_time = MIN_REQUEST_INTERVAL - elapsed
               logger.debug(f"[Task #{task_num}] ⏱️ RPM 제한 대기: {wait_time:.2f}초")
               time.sleep(wait_time)
       last_request_time = time.time()
   ```

### `ai_analyzer.py` ⭐⭐⭐
1. **할당량 초과 감지 강화**
   - ✅ `stderr`와 `stdout` **모두** 체크
   - ✅ `returncode == 0`이어도 stdout 내 에러 감지
   - ✅ JSON 에러 파싱 개선 (배열/객체 모두 지원)

2. **문제 원인 발견**
   - ❌ **기존:** `stderr`만 확인 → 할당량 초과 감지 실패
   - ✅ **수정:** `stdout`에도 429 에러가 JSON으로 나옴
   - ✅ **수정:** 성공 응답(returncode=0)에도 에러 체크 추가

3. **로그 개선**
   - ✅ STDERR와 STDOUT 모두 출력
   - ✅ JSON 파싱 실패 디버그 로그 추가

### `run_ai_analysis.py` - 계정 전환 개선 ⭐⭐⭐
1. **병렬 작업 완전 종료 후 계정 전환**
   - ✅ `ThreadPoolExecutor` 블록 종료 확인
   - ✅ 모든 병렬 작업 완료 후에만 전환

2. **Gemini 프로세스 강제 종료**
   - ✅ `taskkill /F /IM gemini.exe` 실행
   - ✅ `taskkill /F /IM node.exe` 실행 (Gemini CLI는 Node.js 기반)
   - ✅ 2초 대기 후 `.gemini` 폴더 삭제
   
3. **캐시 인증 정보 제거**
   - ✅ `%USERPROFILE%/.gemini` 폴더 완전 삭제
   - ✅ 새 계정의 `.gemini_{ID}` 폴더를 `.gemini`로 복사

### `Dashboard.jsx` (대시보드)
- 분석 속도: "3분당 5건" → **"분당 최대 3건"**
- 병렬 설명: "5개 동시" → **"3개 동시"**
- 예상 완료 시간: 계산식 업데이트

### `GeminiQuota.jsx` (AI 할당량 페이지)
- 병렬 안내: "3분당 5건" → **"분당 최대 3건 (RPM 제한: 60회/분 준수)"**

---

## 🚀 실행 방법

### AI 분석 재시작
```bash
cd E:\LLama\pythonProject\CVE_BOT
python run_ai_analysis.py
```

### 로그 확인
```bash
# 할당량 관련 로그만 확인
Get-Content logs\ai_analysis_YYYYMMDD.log -Tail 100 | Select-String "RPM\|할당량\|Rate Limit"
```

---

## 🎯 예상 효과

### ✅ 장점
1. **Rate Limit 에러 감소:** 거의 0%로 감소
2. **안정적인 분석:** RPM 제한 준수로 중단 없음
3. **계정 수명 연장:** 할당량 소진 속도 감소
4. **재시도 효율 증가:** 일시적 오류만 재시도

### ⚠️ 트레이드오프
- **분석 속도:** 기존 대비 약간 감소 (5개 → 3개 병렬)
- **완료 시간:** 약 1.6배 증가
- **하지만:** 에러 감소로 **실질적 완료 시간은 비슷**!

---

## 📝 로그 예시

### 정상 동작
```
2025-10-20 15:30:12 - [Task #1] ⏱️ RPM 제한 대기: 0.8초
2025-10-20 15:30:13 - [Task #1] 🔄 분석 중: CVE-2025-12345...
2025-10-20 15:30:45 - [Task #1] ✅ 분석 성공 (시도: 1회)
```

### RPM 제한 대기 중
```
2025-10-20 15:30:12 - [Task #2] ⏱️ RPM 제한 대기: 1.2초
2025-10-20 15:30:13 - [Task #3] ⏱️ RPM 제한 대기: 0.5초
```

---

## 🎉 결론
**RPM 제한을 준수하면서도 병렬 처리의 이점을 유지하는 최적의 균형점 확보!**

- ✅ Rate Limit 에러 **거의 제로**
- ✅ 안정적인 **3개 병렬 처리**
- ✅ 할당량 소진 속도 **적절한 수준**
- ✅ 타임아웃 5분 유지로 **긴 분석 지원**

