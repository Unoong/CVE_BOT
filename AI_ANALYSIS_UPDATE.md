# ✅ AI 분석 코드 업데이트 완료 (expected_response 추가)

## 📋 작업 내역

### 1. ai_analyzer.py
- ✅ Gemini CLI 프롬프트를 상세화된 버전으로 교체
- ✅ `expected_response` 필드 포함 (공격 성공 시 서버 응답 상세 기술)
- ✅ `cve_summary`, `stage_description` 작성 지침 강화
- ✅ `save_analysis_to_db()` 함수에 expected_response 저장 로직 추가

### 2. db_manager.py
- ✅ `create_ai_analysis_table()` - expected_response 필드 추가
- ✅ `create_integrated_table()` - ai_expected_response 필드 추가
- ✅ `insert_integrated_data()` - SELECT/INSERT 쿼리 업데이트

### 3. 기존 데이터 처리
- ✅ `add_expected_response.py` - 기존 269개 레코드 'N/A'로 업데이트
- ✅ `CVE_Packet_AI_Analysis` 테이블: 13개 필드 (expected_response 포함)
- ✅ `CVE_Integrated_Data` 테이블: 40개 필드 (ai_expected_response 포함)

---

## 🎯 새로운 Gemini 프롬프트 특징

### 📝 cve_summary 상세화 (200-400자)
```
- **취약점 유형**: SQL Injection, RCE, Path Traversal 등
- **영향받는 시스템**: 제조사, 제품명, 취약 버전 범위
- **공격 메커니즘**: 입력 검증 부재, 권한 확인 누락 등
- **공격 전제조건**: 네트워크 접근성, 인증 필요 여부
- **영향 범위**: 기밀성/무결성/가용성 측면의 구체적 피해
- **CVE_info.txt 활용**: CVSS 점수, CWE 분류 포함
```

### 🔍 stage_description 상세화 (150-300자, 3-5문장)
```
1. **단계의 목적**: 전체 공격 체인에서의 역할
2. **기술적 행위**: HTTP 메서드, 엔드포인트, 파라미터/헤더, 페이로드 구조
3. **예상 동작**: 정상/취약 서버의 응답 차이
4. **보안 영향**: 성공 시 공격자가 얻는 이점
5. **탐지 포인트**: 시그니처 요소, 비정상 패턴
```

### 🎯 expected_response 신규 추가 (100-200자)
```
공격 성공 시 서버 응답 상세 기술:
- **HTTP 응답 코드**: 200 OK, 500 Internal Server Error 등
- **응답 헤더**: Set-Cookie, Content-Type 등
- **응답 본문**: JSON, HTML, 에러 메시지, 파일 내용 등
- **성공 지표**: 'root:x:0:0' 문자열, 세션 토큰, 명령 실행 결과 등
- **실패 시 차이점**: 취약점이 없을 때의 응답과 비교

예시:
"공격 성공 시 서버는 HTTP 200 OK를 반환하며, Content-Type: text/plain 헤더와 함께 
/etc/passwd 파일의 전체 내용을 응답 본문에 포함합니다. 응답에는 'root:x:0:0:root:/root:/bin/bash'로 
시작하는 사용자 계정 정보가 포함되며, 이는 Path Traversal 취약점이 성공적으로 악용되었음을 
의미합니다. 정상적인 서버라면 403 Forbidden 또는 404 Not Found를 반환합니다."
```

---

## 🔧 코드 변경 사항

### ai_analyzer.py

#### 1. 프롬프트 업데이트 (50줄 → 상세 버전)
```python
# Before
prompt = r"SYSTEM:\r\n당신은 숙련된 침해사고 분석가 보조입니다. ..."

# After
prompt = r"""SYSTEM:\r\n당신은 숙련된 침해사고 분석가 보조입니다. 아래 지침을 **정확히** 준수하십시오.
...
### cve_summary 작성 지침 (상세화):
- **취약점 유형**: ...
- **영향받는 시스템**: ...
...
### expected_response 작성 지침 (신규):
- 각 공격 단계에서 **취약점이 존재하고 공격이 성공했을 때** 서버가 반환하는 응답을 상세히 기술
...
"""
```

#### 2. save_analysis_to_db() 업데이트
```python
# Before (11개 필드)
cursor.execute('''
    INSERT INTO CVE_Packet_AI_Analysis
    (link, download_path, cve_summary, step, packet_text, vuln_stage,
     stage_description, mitre_tactic, mitre_technique, snort_rule, remediation)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
''', (
    link, download_path, cve_summary,
    step_data.get('step', 0),
    step_data.get('packet_text', ''),
    step_data.get('vuln_stage', ''),
    step_data.get('stage_description', ''),
    step_data.get('mitre_tactic'),
    step_data.get('mitre_technique'),
    step_data.get('snort_rule', ''),
    remediation_text
))

# After (12개 필드)
cursor.execute('''
    INSERT INTO CVE_Packet_AI_Analysis
    (link, download_path, cve_summary, step, packet_text, vuln_stage,
     stage_description, mitre_tactic, mitre_technique, snort_rule, remediation, expected_response)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
''', (
    link, download_path, cve_summary,
    step_data.get('step', 0),
    step_data.get('packet_text', ''),
    step_data.get('vuln_stage', ''),
    step_data.get('stage_description', ''),
    step_data.get('mitre_tactic'),
    step_data.get('mitre_technique'),
    step_data.get('snort_rule', ''),
    remediation_text,
    step_data.get('expected_response', '')  # ✅ 새로 추가
))
```

---

## 📊 새로운 JSON 스키마

### Gemini 출력 형식
```json
{
  "cve_summary": "취약점 유형, 영향받는 시스템/버전, 공격 메커니즘, 전제조건, 영향 범위를 포함한 상세 설명 (200-400자)",
  "poc_analysis": {
    "attack_steps": [
      {
        "step": 1,
        "packet_text": "GET /admin/../../../etc/passwd HTTP/1.1\r\nHost: target.com\r\nUser-Agent: Mozilla/5.0\r\n\r\n",
        "vuln_stage": "Reconnaissance",
        "stage_description": "이 단계는 인증을 우회하여 관리자 세션을 획득하기 위한 초기 정찰 단계입니다. 공격자는 GET 요청을 /admin/config.php 엔드포인트로 전송하며, User-Agent 헤더에 '../'를 포함한 Path Traversal 페이로드를 삽입합니다. 취약한 서버는 입력 검증 없이 헤더 값을 파일 경로 생성에 사용하여 /etc/passwd 내용을 응답으로 반환합니다. 이를 통해 공격자는 시스템 사용자 목록을 확보하여 후속 Brute Force 공격의 표적을 식별할 수 있습니다. 탐지는 비정상적인 User-Agent 헤더 패턴과 민감 파일 접근 시도 로깅으로 가능합니다.",
        "expected_response": "공격 성공 시 서버는 HTTP 200 OK를 반환하며, Content-Type: text/plain 헤더와 함께 /etc/passwd 파일의 전체 내용을 응답 본문에 포함합니다. 응답에는 'root:x:0:0:root:/root:/bin/bash'로 시작하는 사용자 계정 정보가 포함되며, 이는 Path Traversal 취약점이 성공적으로 악용되었음을 의미합니다. 정상적인 서버라면 403 Forbidden 또는 404 Not Found를 반환하거나, 헤더 값을 파일 경로로 해석하지 않고 빈 응답을 반환합니다.",
        "mitre_tactic": "Discovery",
        "mitre_technique": "T1083",
        "snort_rule": "alert tcp any any -> any 80 (msg:\"Path Traversal Attempt in URI\"; flow:to_server,established; content:\"GET\"; http_method; content:\"../..\"; http_uri; sid:1000001; rev:1;)"
      }
    ]
  },
  "remediation": [
    "벤더가 제공하는 최신 보안 패치를 즉시 적용하십시오.",
    "입력 검증 로직을 강화하여 Path Traversal 문자열을 차단하십시오.",
    "WAF(Web Application Firewall)를 배포하여 비정상적인 요청을 차단하십시오."
  ]
}
```

---

## 🗄️ 데이터베이스 구조

### CVE_Packet_AI_Analysis (13개 필드)
```sql
CREATE TABLE CVE_Packet_AI_Analysis (
    id INT AUTO_INCREMENT PRIMARY KEY,
    link TEXT,
    download_path TEXT,
    cve_summary TEXT,
    step INT,
    packet_text LONGTEXT,
    vuln_stage TEXT,
    stage_description TEXT,          -- ✅ 상세화 (150-300자)
    mitre_tactic TEXT,
    mitre_technique TEXT,
    snort_rule TEXT,
    remediation TEXT,
    expected_response TEXT            -- ✅ 신규 추가 (100-200자)
);
```

### CVE_Integrated_Data (40개 필드)
```sql
-- Github_CVE_Info (12개)
-- CVE_Info (17개)
-- CVE_Packet_AI_Analysis (10개)
    ai_cve_summary TEXT,
    ai_step INT,
    ai_packet_text LONGTEXT,
    ai_vuln_stage TEXT,
    ai_stage_description TEXT,        -- ✅ 상세화
    ai_mitre_tactic TEXT,
    ai_mitre_technique TEXT,
    ai_snort_rule TEXT,
    ai_remediation TEXT,
    ai_expected_response TEXT,        -- ✅ 신규 추가
-- 메타데이터 (created_at, indexes)
```

---

## 🚀 실행 방법

### 1. 새로운 CVE 분석 (향후)
```bash
# 자동 실행 (10분마다)
python run_ai_analysis.py

# 단일 실행 (테스트용)
python run_ai_analysis.py --once
```

### 2. 기존 CVE 재분석
```sql
-- Github_CVE_Info에서 AI_chk를 'N'으로 변경
UPDATE Github_CVE_Info SET AI_chk = 'N' WHERE id = 123;

-- 그 후 run_ai_analysis.py 실행
```

### 3. 통합 테이블 재생성
```bash
python create_integrated_data.py
```

---

## 📈 기대 효과

### 1. 분석 품질 향상
```
Before: "단순 스캔: 취약점 존재 확인을 위한 에러 유도"
After: "이 단계는 인증을 우회하여 관리자 세션을 획득하기 위한 초기 정찰 단계입니다. 
       공격자는 GET 요청을 /admin/config.php 엔드포인트로 전송하며, User-Agent 헤더에 
       '../'를 포함한 Path Traversal 페이로드를 삽입합니다. [...]"
       
→ 3-5배 더 상세한 분석
```

### 2. 실전 대응력 강화
```
expected_response를 통해:
- ✅ 공격 성공 여부를 명확히 판단
- ✅ POC 재현 시 예상 결과 확인
- ✅ 탐지 룰 작성 시 정확한 시그니처 확보
- ✅ 보고서 작성 시 구체적인 증거 제시
```

### 3. 교육 자료로 활용
```
- 보안 교육 시 실제 공격 응답을 예시로 활용
- 침해사고 대응 시나리오 작성에 활용
- 레드팀/블루팀 훈련 자료로 활용
```

---

## ✅ 변경 사항 체크리스트

- [x] ai_analyzer.py 프롬프트 업데이트 (expected_response 추가)
- [x] ai_analyzer.py save_analysis_to_db() 업데이트 (expected_response 저장)
- [x] db_manager.py create_ai_analysis_table() 업데이트
- [x] db_manager.py create_integrated_table() 업데이트
- [x] db_manager.py insert_integrated_data() 업데이트
- [x] add_expected_response.py 실행 (기존 데이터 'N/A' 처리)
- [x] CVE_Packet_AI_Analysis 테이블: 13개 필드
- [x] CVE_Integrated_Data 테이블: 40개 필드

---

## 📝 다음 단계

### 1. 웹사이트 UI 업데이트 (권장)
```javascript
// POCDetail.jsx
<Box>
  <Typography variant="h6">예상 응답 (Expected Response)</Typography>
  <Typography>{step.expected_response || 'N/A'}</Typography>
</Box>
```

### 2. API 엔드포인트 추가 (필요 시)
```javascript
// server.js
app.get('/api/cve/poc/:id/responses', (req, res) => {
  // expected_response만 조회하는 API
});
```

### 3. 데이터 검증
```bash
# 최신 분석 결과 확인
SELECT id, vuln_stage, LENGTH(expected_response) as response_length
FROM CVE_Packet_AI_Analysis
WHERE expected_response IS NOT NULL
ORDER BY id DESC LIMIT 10;
```

---

## 🎯 프롬프트 최적화 팁

### temperature=0 설정 확인
```bash
# gemini-cli 실행 시 temperature=0 자동 적용됨
gemini -m gemini-2.5-pro --all-files -p "..."
```

### 출력 품질 모니터링
```python
# ai_analyzer.py에서 로깅 확인
logger.info(f"[Gemini] stage_description 길이: {len(stage_description)}")
logger.info(f"[Gemini] expected_response 길이: {len(expected_response)}")
```

---

**끝!** 🎊

모든 AI 분석 코드가 `expected_response` 필드를 포함하도록 업데이트되었습니다!
새로 수집되는 CVE는 자동으로 상세한 응답 분석을 포함하게 됩니다.

