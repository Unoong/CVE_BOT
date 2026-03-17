# ✅ Gemini API 일일 할당량 초과 처리 완료

## 📋 문제

**Gemini API 일일 할당량 (2000 requests/day) 초과 시:**
```
"message": "Quota exceeded for quota metric 'Chat API requests' 
            and limit 'Chat API requests per day per user'"
"status": "RESOURCE_EXHAUSTED"
"reason": "RATE_LIMIT_EXCEEDED"
"quota_limit": "ChatRequestsPerDay"
"quota_limit_value": "2000"
```

**이전 동작:**
- ❌ 할당량 초과해도 `AI_chk`를 'Y'로 변경
- ❌ 해당 CVE가 다시 분석되지 않음
- ❌ 다음날에도 재시도 불가능

---

## ✨ 수정 내용

### 1. **ai_analyzer.py** - 에러 감지 개선

```python
# 일일 할당량 초과 체크 (87-99줄)
quota_keywords = [
    'quota exceeded',
    'RESOURCE_EXHAUSTED',
    'RATE_LIMIT_EXCEEDED',
    'quota_limit',
    'ChatRequestsPerDay',
    'quota metric'
]

if any(keyword in error_msg for keyword in quota_keywords):
    logger.error(f"[Gemini] ⚠️ 일일 할당량 초과 감지!")
    return {'error': 'quota_exceeded', 'message': '일일 할당량 초과'}

# 일시적 토큰 제한은 별도 처리 (102-104줄)
if 'rate limit' in error_msg.lower():
    return {'error': 'rate_limit', 'message': '일시적 토큰 제한'}
```

**반환 타입:**
- `'quota_exceeded'`: 일일 할당량 초과 → AI_chk 유지, 날짜 변경 후 재시도
- `'rate_limit'`: 일시적 제한 → 10분 대기 후 재시도
- `None`: 일반 실패 → AI_chk 'Y'로 변경

---

### 2. **run_ai_analysis.py** - 할당량 초과 처리

#### 2-1. process_one_cve() 함수 (73-76줄)
```python
# 일일 할당량 초과 체크 (AI_chk 'Y'로 변경하지 않음!)
if isinstance(analysis_result, dict) and analysis_result.get('error') == 'quota_exceeded':
    logger.error(f"[⚠️ Quota Exceeded] 일일 할당량 초과 - AI_chk 유지")
    return 'quota_exceeded'
```

**핵심:**
- ✅ `AI_chk`를 'Y'로 변경하지 않음
- ✅ `'quota_exceeded'` 반환으로 상위 루프에 알림

#### 2-2. run_analysis_cycle() 함수 (146-167줄)
```python
elif result == 'quota_exceeded':
    logger.error("="*80)
    logger.error("[⚠️ Quota Exceeded] Gemini 일일 할당량 초과!")
    logger.error(f"  AI_chk 상태: 'N' 유지 (날짜 변경 후 자동 재시도)")
    logger.error("="*80)
    
    # 다음날까지 대기 시간 계산
    now = datetime.now()
    tomorrow = datetime(now.year, now.month, now.day) + timedelta(days=1)
    wait_seconds = (tomorrow - now).total_seconds()
    
    logger.error(f"  다음 시도: {tomorrow.strftime('%Y-%m-%d %H:%M:%S')}")
    
    quota_exceeded = True
    break  # 현재 사이클 중단
```

**핵심:**
- ✅ 현재 CVE 처리 중단
- ✅ 남은 CVE들은 `AI_chk = 'N'` 유지
- ✅ `quota_exceeded = True` 반환

#### 2-3. main() 함수 (232-259줄)
```python
if quota_exceeded:
    quota_exceeded_mode = True
    
    # 다음날까지 대기
    now = datetime.now()
    tomorrow = datetime(now.year, now.month, now.day) + timedelta(days=1)
    wait_seconds = (tomorrow - now).total_seconds()
    
    logger.info(f"[⚠️ Quota Exceeded Mode] 날짜 변경까지 대기")
    logger.info(f"  현재 시간: {now.strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info(f"  다음 시도: {tomorrow.strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info(f"  대기 시간: 약 {wait_hours:.1f}시간")
    
    # 날짜가 바뀔 때까지 대기
    time.sleep(wait_seconds + 60)  # 날짜 변경 + 1분 여유
    
    logger.info(f"[✅ Date Changed] 날짜 변경 완료 - 분석 재개")
    continue  # 즉시 다음 사이클 실행
```

**핵심:**
- ✅ 날짜가 바뀔 때까지 대기 (자동 계산)
- ✅ 날짜 변경 후 즉시 재개 (10분 대기 없음)
- ✅ `AI_chk = 'N'`인 CVE들을 자동으로 재시도

---

## 🎯 새로운 동작 흐름

### 1. 정상 케이스
```
CVE 수집 → AI 분석 → 성공 → AI_chk 'Y' → 10분 대기 → 반복
```

### 2. 일시적 토큰 제한 (분당 제한 등)
```
CVE 수집 → AI 분석 → rate_limit → 10분 대기 → 재시도 → 성공 → AI_chk 'Y'
```

### 3. 일일 할당량 초과 (NEW!) ✨
```
CVE 수집 → AI 분석 (100개 처리)
          ↓
    quota_exceeded 감지
          ↓
    현재 사이클 중단
    AI_chk 'N' 유지 (처리 안 된 CVE들)
          ↓
    날짜 변경까지 대기 (자동 계산)
    예: 오후 3시 → 다음날 0시 1분까지 대기
          ↓
    [다음날 0시 1분]
    날짜 변경 확인
          ↓
    즉시 분석 재개 (AI_chk 'N'인 CVE들)
          ↓
    새로운 할당량 (2000 requests) 사용
```

---

## 📊 에러 타입 비교

| 에러 타입 | 원인 | AI_chk | 대기 시간 | 재시도 |
|----------|------|--------|----------|--------|
| `quota_exceeded` | 일일 2000 requests 초과 | **'N' 유지** | 다음날까지 | ✅ 자동 |
| `rate_limit` | 분당 제한 | 'N' 유지 | 10분 | ✅ 즉시 |
| 일반 실패 | 분석 실패, 파일 없음 | 'Y' 처리 | - | ❌ 없음 |

---

## 🔍 로그 예시

### 할당량 초과 감지
```
2025-10-12 15:30:45 - AI_Analyzer - ERROR - [Gemini] ⚠️ 일일 할당량 초과 감지!
2025-10-12 15:30:45 - AI_Analyzer - ERROR - [Gemini] 에러 메시지:
Quota exceeded for quota metric 'Chat API requests'...

2025-10-12 15:30:45 - AI_Analysis_Runner - ERROR - ================================================================================
2025-10-12 15:30:45 - AI_Analysis_Runner - ERROR - [⚠️ Quota Exceeded] Gemini 일일 할당량 초과!
2025-10-12 15:30:45 - AI_Analysis_Runner - ERROR - ================================================================================
2025-10-12 15:30:45 - AI_Analysis_Runner - ERROR -   현재 시간: 2025-10-12 15:30:45
2025-10-12 15:30:45 - AI_Analysis_Runner - ERROR -   처리 중단: 100/350 (남은 251개는 다음날 처리)
2025-10-12 15:30:45 - AI_Analysis_Runner - ERROR -   AI_chk 상태: 'N' 유지 (날짜 변경 후 자동 재시도)
2025-10-12 15:30:45 - AI_Analysis_Runner - ERROR - ================================================================================
2025-10-12 15:30:45 - AI_Analysis_Runner - ERROR -   다음 시도: 2025-10-13 00:01:00 (약 8.5시간 후)
2025-10-12 15:30:45 - AI_Analysis_Runner - ERROR -   프로그램은 계속 실행되며, 날짜가 바뀌면 자동으로 재개됩니다
```

### 날짜 변경 후 재개
```
2025-10-13 00:01:00 - AI_Analysis_Runner - INFO - ================================================================================
2025-10-13 00:01:00 - AI_Analysis_Runner - INFO - [✅ Date Changed] 날짜 변경 완료 - 분석 재개
2025-10-13 00:01:00 - AI_Analysis_Runner - INFO - ================================================================================

2025-10-13 00:01:01 - AI_Analysis_Runner - INFO - 사이클 #25 시작 - 2025-10-13 00:01:01
2025-10-13 00:01:02 - AI_Analysis_Runner - INFO - [발견] 251개의 미분석 CVE 발견
```

---

## ✅ 변경 요약

### 수정된 파일
1. ✅ `ai_analyzer.py` (87-104줄)
   - 일일 할당량 초과 감지 개선
   - `'quota_exceeded'` 반환 추가

2. ✅ `run_ai_analysis.py` (73-76, 146-167, 232-259줄)
   - 할당량 초과 시 AI_chk 유지
   - 날짜 변경 대기 로직 추가
   - 자동 재시도 구현

### 추가된 import
```python
from datetime import datetime, timedelta  # timedelta 추가
```

---

## 🎯 효과

### Before (이전)
```
할당량 초과 → AI_chk 'Y' → 영구 스킵 → 수동 수정 필요
```

### After (현재) ✨
```
할당량 초과 → AI_chk 'N' 유지 → 날짜 변경 대기 → 자동 재시도 → 성공
```

**장점:**
- ✅ 자동화: 수동 개입 불필요
- ✅ 데이터 손실 없음: 모든 CVE 분석 완료
- ✅ 효율적: 할당량 리셋 즉시 재개
- ✅ 로깅: 상세한 상태 추적

---

## 🚀 사용 방법

### 실행
```bash
python run_ai_analysis.py
```

### 동작
1. 10분마다 AI 분석 실행
2. 할당량 초과 시 자동으로 다음날까지 대기
3. 날짜 변경 후 자동으로 재개
4. Ctrl+C로 종료

### 확인
```bash
# 로그 파일 확인
tail -f logs/ai_analysis_20251012.log

# AI_chk가 'N'인 CVE 확인 (MySQL)
SELECT COUNT(*) FROM Github_CVE_Info WHERE AI_chk = 'N';
```

---

## 📝 주의사항

1. **프로그램을 계속 실행 상태로 유지하세요**
   - 날짜 변경 감지 및 자동 재시도를 위해 필요
   - 백그라운드 실행 권장: `nohup python run_ai_analysis.py &`

2. **할당량 관리**
   - Gemini API: 2000 requests/day
   - 하루에 약 2000개 CVE 분석 가능
   - 초과 시 자동으로 다음날 처리

3. **AI_chk 필드**
   - 'N': 미분석 (재시도 가능)
   - 'Y': 분석 완료 또는 스킵

---

**끝!** 🎉

이제 Gemini API 일일 할당량 초과 시에도 데이터 손실 없이 자동으로 처리됩니다!

