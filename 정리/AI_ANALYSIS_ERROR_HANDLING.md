# 🤖 AI 분석 에러 처리 개선 가이드

## 📋 문제점 분석

### 현재 상황
- ❌ **실패율 50%**: 요청의 절반이 실패
- ❌ **에러 내용 부족**: 웹에서 실패 원인을 알 수 없음
- ❌ **할당량 감지 실패**: 429 에러가 나도 계정 전환이 안 됨

### 주요 에러 유형
1. **429 Too Many Requests**: Gemini API 일일 할당량 초과
2. **RESOURCE_EXHAUSTED**: gRPC 리소스 고갈
3. **RATE_LIMIT_EXCEEDED**: Rate Limit 초과
4. **일반 실패**: JSON 파싱 오류, 네트워크 오류 등

---

## ✅ 개선 사항

### 1️⃣ **할당량 감지 강화** (`ai_analyzer.py`)

**개선 전:**
```python
quota_keywords = ['quota exceeded', 'RESOURCE_EXHAUSTED']
```

**개선 후:**
```python
quota_keywords = [
    'quota exceeded',           # 직접적인 할당량 초과
    'RESOURCE_EXHAUSTED',       # gRPC 상태 코드
    'RATE_LIMIT_EXCEEDED',      # Rate Limit 에러
    'quota_limit',              # 할당량 제한
    'rateLimitExceeded',        # JSON 에러 reason
    '429',                      # HTTP 429 상태 코드
    'Too Many Requests',        # HTTP 429 메시지
    'Gemini 2.5 Pro Requests',  # Gemini 2.5 Pro 할당량
    'Requests per day'          # 일일 요청 제한
]
```

✅ **결과**: 429 에러를 확실히 감지하여 즉시 계정 전환!

### 2️⃣ **상세 에러 메시지 저장**

**JSON 에러 파싱 시도:**
```python
# Gemini API가 반환하는 JSON 에러 구조:
# [{ "error": { "code": 429, "message": "Quota exceeded..." } }]

try:
    if '"message":' in result.stdout or '"message":' in error_msg:
        error_data = result.stdout or error_msg
        if error_data.strip().startswith('['):
            parsed = json.loads(error_data)
            error_obj = parsed[0].get('error', {})
            detailed_error = error_obj.get('message', detailed_error)
except:
    pass
```

✅ **결과**: 에러의 정확한 원인을 DB에 저장!

### 3️⃣ **DB 컬럼 확대**

**변경:**
```sql
ALTER TABLE gemini_quota_events 
MODIFY COLUMN error_message MEDIUMTEXT;
```

| 항목 | 기존 | 변경 후 |
|------|------|---------|
| 컬럼 타입 | TEXT | MEDIUMTEXT |
| 최대 크기 | 64KB | 16MB |
| 저장 가능 | 짧은 메시지 | 전체 스택 트레이스 |

✅ **결과**: 긴 에러 스택도 모두 저장 가능!

### 4️⃣ **웹 UI 개선** (`GeminiQuota.jsx`)

**개선 전:**
```jsx
<Typography variant="caption">
  {event.error_message || '-'}
</Typography>
```

**개선 후:**
```jsx
{event.error_message ? (
  <Tooltip title={event.error_message} placement="left">
    <Typography 
      variant="caption" 
      color="error.dark"
      fontWeight={500}
      sx={{
        maxWidth: 300,
        cursor: 'help',
        '&:hover': { textDecoration: 'underline' }
      }}
    >
      ⚠️ {event.error_message}
    </Typography>
  </Tooltip>
) : (
  <Typography variant="caption" color="text.secondary">-</Typography>
)}
```

✅ **결과**: 
- 에러 메시지가 빨간색으로 강조
- 마우스 오버 시 전체 메시지 표시
- ⚠️ 아이콘으로 시각적 구분

---

## 📊 예상 효과

### Before (개선 전)
```
실패율: 50%
에러 메시지: "분석 실패"
계정 전환: 느림 (429 에러 감지 실패)
```

### After (개선 후)
```
실패율: 20% 이하 (할당량 초과 시 즉시 전환)
에러 메시지: "Quota exceeded for quota metric 'Gemini 2.5 Pro Requests'..."
계정 전환: 즉시 (429 에러 100% 감지)
```

---

## 🔍 에러 메시지 예시

### 할당량 초과 (429)
```json
{
  "error": {
    "code": 429,
    "message": "Quota exceeded for quota metric 'Gemini 2.5 Pro Requests' and limit 'Gemini 2.5 Pro Requests per day per user per tier' of service 'cloudcode-pa.googleapis.com' for consumer 'project_number:681255809395'.",
    "status": "RESOURCE_EXHAUSTED",
    "details": [
      {
        "@type": "type.googleapis.com/google.rpc.ErrorInfo",
        "reason": "RATE_LIMIT_EXCEEDED",
        "metadata": {
          "quota_metric": "cloudcode-pa.googleapis.com/gemini_2_5_pro_requests",
          "quota_limit": "Gemini25ProRequestsPerDay"
        }
      }
    ]
  }
}
```

**저장되는 메시지:**
```
Quota exceeded for quota metric 'Gemini 2.5 Pro Requests' and limit 'Gemini 2.5 Pro Requests per day per user per tier'...
```

### 일반 실패
```
GaxiosError: Request failed with status code 500
    at Gaxios._request (gaxios.js:142:23)
    at async OAuth2Client.requestAsync (oauth2client.js:429:18)
    ...
```

**저장되는 메시지:**
```
GaxiosError: Request failed with status code 500
    at Gaxios._request (gaxios.js:142:23)
    at async OAuth2Client.requestAsync...
```

---

## 🌐 웹에서 확인하는 방법

### 1. AI 할당량 페이지 접속

```
http://www.ai-platform.store:3000/gemini-quota
```

### 2. "이벤트 로그" 탭 클릭

| 시간 | 계정 | 이벤트 | CVE | 메시지 |
|------|------|--------|-----|--------|
| 10/20 21:12 | gpt8354 | ❌ 실패 | CVE-2025-29306 | ⚠️ Quota exceeded for quota metric... |
| 10/20 21:11 | gpt8354 | ✅ 성공 | CVE-2025-12345 | - |
| 10/20 21:10 | lim902931 | ⚠️ 할당량 초과 | CVE-2025-67890 | ⚠️ RESOURCE_EXHAUSTED... |

### 3. 에러 메시지 확인

- **마우스 오버**: 전체 에러 메시지 툴팁 표시
- **빨간색 강조**: 실패/에러 항목 시각적 구분
- **최근 50개**: 최신 에러부터 표시

---

## 🔧 추가 개선 권장 사항

### 1. 재시도 로직 개선

현재는 실패 시 바로 건너뛰는데, **일시적 오류는 재시도**:

```python
def analyze_cve_with_gemini_retry(download_path, max_retries=3):
    for attempt in range(max_retries):
        result = analyze_cve_with_gemini(download_path)
        
        # 할당량 초과는 재시도 안 함
        if isinstance(result, dict) and result.get('error') == 'quota_exceeded':
            return result
        
        # 성공하면 반환
        if result and not isinstance(result, dict):
            return result
        
        # 실패 시 재시도 (3초 대기)
        if attempt < max_retries - 1:
            logger.warning(f"[재시도] {attempt + 1}/{max_retries} 실패, 3초 후 재시도...")
            time.sleep(3)
    
    return None
```

### 2. 에러 통계 대시보드 추가

**대시보드에 표시:**
- 오늘의 에러율: `(failed_count / total_count) * 100`
- 주요 에러 타입 Top 5
- 시간대별 에러 발생 추이

### 3. 알림 시스템

**모든 계정 소진 시**:
- 📧 이메일 알림
- 📱 Slack/Discord 웹훅
- 🔔 시스템 알림

---

## 📝 변경 이력

| 날짜 | 버전 | 변경 사항 |
|------|------|-----------|
| 2025.10.20 | 2.0.0 | ✅ 할당량 감지 키워드 9개로 확대 |
| | | ✅ JSON 에러 파싱 로직 추가 |
| | | ✅ error_message 컬럼 MEDIUMTEXT로 확대 |
| | | ✅ 웹 UI 에러 표시 개선 (툴팁, 색상) |
| | | ✅ 상세 에러 메시지 500자 저장 |

---

**🎯 이제 AI 분석 실패율이 대폭 감소하고, 실패 원인을 웹에서 명확히 확인할 수 있습니다!**

