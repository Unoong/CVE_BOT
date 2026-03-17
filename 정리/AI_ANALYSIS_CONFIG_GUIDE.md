# 🔧 AI 분석 설정 가이드

## 📌 설정 파일 위치
`E:\LLama\pythonProject\CVE_BOT\ai_analysis_config.json`

---

## ⚙️ 설정 항목

### 1️⃣ **병렬 처리 설정** (`parallel_processing`)

```json
{
  "parallel_processing": {
    "enabled": false,    // ⚠️ 기본값: 비활성화 (순차 처리)
    "max_workers": 1     // 병렬 활성화 시 동시 실행 개수 (최대 3 권장)
  }
}
```

| 설정 | 설명 | 권장값 |
|------|------|--------|
| `enabled` | 병렬 처리 활성화 여부 | `false` (안정성 우선) |
| `max_workers` | 동시 실행 개수 | `1` (순차) / `3` (병렬) |

**⚠️ 주의사항:**
- 병렬 처리는 **RPM 60 제한**으로 인해 불안정할 수 있습니다
- **안정성이 중요하면 `enabled: false` 유지 권장**
- 병렬 활성화 시 `max_workers`는 3 이하 권장

---

### 2️⃣ **API 제한 설정** (`api_limits`)

```json
{
  "api_limits": {
    "requests_per_minute": 60,             // Gemini API RPM 제한
    "min_request_interval_seconds": 1.5,   // 최소 요청 간격 (초)
    "timeout_seconds": 300                 // 타임아웃 (5분)
  }
}
```

| 설정 | 설명 | 권장값 |
|------|------|--------|
| `requests_per_minute` | 분당 요청 제한 | `60` (변경 금지) |
| `min_request_interval_seconds` | 최소 요청 간격 | `1.5` (안전 여유) |
| `timeout_seconds` | 분석 타임아웃 | `300` (5분) |

---

### 3️⃣ **재시도 설정** (`retry`)

```json
{
  "retry": {
    "max_retries": 2,           // 최대 재시도 횟수 (총 3회 시도)
    "retry_delay_seconds": 3    // 재시도 대기 시간
  }
}
```

| 설정 | 설명 | 권장값 |
|------|------|--------|
| `max_retries` | 최대 재시도 횟수 | `2` (총 3회) |
| `retry_delay_seconds` | 재시도 간격 | `3` 초 |

---

## 🚀 사용 예시

### 예시 1: **안정적인 순차 처리** (기본값, 권장)

```json
{
  "parallel_processing": {
    "enabled": false,
    "max_workers": 1
  },
  "api_limits": {
    "requests_per_minute": 60,
    "min_request_interval_seconds": 1.5,
    "timeout_seconds": 300
  },
  "retry": {
    "max_retries": 2,
    "retry_delay_seconds": 3
  }
}
```

**특징:**
- ✅ **가장 안정적** (에러 최소)
- ✅ 계정 전환 빠름
- ❌ 속도 느림 (분당 1건)

---

### 예시 2: **빠른 병렬 처리** (불안정할 수 있음)

```json
{
  "parallel_processing": {
    "enabled": true,
    "max_workers": 3    // ⚠️ 최대 3까지만!
  },
  "api_limits": {
    "requests_per_minute": 60,
    "min_request_interval_seconds": 1.5,
    "timeout_seconds": 300
  },
  "retry": {
    "max_retries": 2,
    "retry_delay_seconds": 3
  }
}
```

**특징:**
- ✅ 빠른 처리 (분당 최대 3건)
- ⚠️ RPM 제한으로 인한 429 에러 가능
- ⚠️ 계정 전환 시 실행 중인 작업 강제 중단

---

## 🔧 설정 변경 방법

### 1. 설정 파일 편집
```bash
notepad E:\LLama\pythonProject\CVE_BOT\ai_analysis_config.json
```

### 2. AI 분석 재시작
```bash
cd E:\LLama\pythonProject\CVE_BOT
python run_ai_analysis.py
```

### 3. 로그 확인
```
[설정] 병렬 처리: 비활성화 (순차 처리)
[설정] RPM 제한: 60회/분 (최소 간격: 1.5초)
[설정] 재시도: 최대 2회 (3초 간격)
```

---

## 🎯 할당량 초과 시 동작

### ⚡ **즉시 중단 메커니즘**

```
1. Task #1에서 429 에러 감지
   ↓
2. 전역 플래그 설정 (quota_exceeded_flag.set())
   ↓
3. 실행 중인 Task #2, #3 즉시 체크 후 중단 (🛑)
   ↓
4. ThreadPoolExecutor 종료 대기
   ↓
5. ⚡ 현재 계정을 만료 목록에 저장 (.gemini_exhausted_accounts.json)
   ↓
6. Gemini 프로세스 강제 종료 (taskkill)
   ↓
7. .gemini 폴더 삭제 & 새 계정 복사
   ↓
8. 플래그 초기화 (quota_exceeded_flag.clear())
   ↓
9. 새 계정으로 분석 재개
```

### 📁 **만료 계정 관리**

**파일:** `.gemini_exhausted_accounts.json`
```json
{
  "date": "2025-10-20",
  "accounts": [
    ".gemini_gpt8354",
    ".gemini_imjong1111"
  ]
}
```

**동작:**
- ✅ 할당량 초과 계정 **자동 저장**
- ✅ 재시작 시 **자동으로 건너뜀**
- ✅ 날짜 변경 시 **자동 초기화**
- ✅ 다음날 0시 이후 **모든 계정 다시 사용 가능**

**예상 로그:**
```
[Task #1] 🚨 할당량 초과 감지! 전역 플래그 설정 → 모든 작업 중단
[Task #2] 🛑 할당량 초과 플래그 감지 - 작업 즉시 중단
[Task #3] 🛑 할당량 초과 플래그 감지 - 작업 즉시 중단
[병렬 처리] ThreadPoolExecutor 종료 완료 (모든 작업 중단)
[계정 전환] 실행 중인 Gemini 프로세스 종료 중...
[계정 전환] ✅ Gemini 프로세스 종료 완료
[플래그 해제] 할당량 초과 플래그 초기화 완료
[✅ 계정 전환 성공] imjong1111 계정으로 전환!
```

---

## 📊 성능 비교

| 설정 | 속도 | 안정성 | 계정 전환 | 권장 |
|------|------|--------|----------|------|
| **순차 (enabled: false)** | 분당 1건 | ⭐⭐⭐⭐⭐ | 빠름 | ✅ **권장** |
| **병렬 3개 (enabled: true)** | 분당 최대 3건 | ⭐⭐⭐ | 느림 | ⚠️ 테스트용 |

---

## 🎉 완료!

**이제 설정 파일로 병렬 처리를 쉽게 ON/OFF 할 수 있습니다!**

- ✅ 기본값: **순차 처리** (가장 안정적)
- ✅ 필요 시: **병렬 처리** 활성화 가능
- ✅ 할당량 초과 시: **즉시 모든 작업 중단** → 계정 전환

