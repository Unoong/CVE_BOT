# CVE POC AI 분석기

Gemini AI를 사용하여 수집된 CVE POC를 자동으로 분석하고 공격 패킷을 추출합니다.

## 기능

- **자동 분석**: AI_chk가 'N'인 항목을 자동으로 찾아 분석
- **공격 단계 추출**: POC 코드에서 공격 단계별 패킷 추출
- **MITRE ATT&CK 매핑**: 공격 기법을 MITRE 프레임워크에 매핑
- **Snort 규칙 생성**: 각 공격 단계별 탐지 규칙 자동 생성
- **10분마다 자동 실행**: 새로운 CVE가 추가되면 자동으로 분석

## 사전 요구사항

### 1. Gemini CLI 설치

```bash
npm install -g @google/generative-ai-cli
# 또는
pip install google-generativeai
```

### 2. Gemini API 키 설정

환경 변수 또는 Gemini CLI 설정에 API 키 등록 필요

## 사용 방법

### 분석기 실행

```bash
cd E:\LLama\pythonProject\CVE_BOT
python run_ai_analysis.py
```

### 동작 방식

1. **10분마다 자동 실행**
2. `Github_CVE_Info` 테이블에서 `AI_chk = 'N'` 조회
3. 각 CVE의 `download_path`에서 POC 코드 분석
4. Gemini AI가 POC를 분석하여 JSON 응답
5. `CVE_Packet_AI_Analysis` 테이블에 저장
6. `AI_chk`를 'Y'로 업데이트

## 데이터베이스 스키마

### CVE_Packet_AI_Analysis 테이블

```sql
CREATE TABLE CVE_Packet_AI_Analysis (
    id INT AUTO_INCREMENT PRIMARY KEY,
    link TEXT,              -- GitHub 링크 (공통)
    download_path TEXT,     -- 다운로드 경로 (공통)
    cve_summary TEXT,       -- CVE 요약 (공통)
    step INT,               -- 공격 단계 번호
    packet_text LONGTEXT,   -- 원시 패킷 텍스트
    vuln_stage TEXT,        -- 취약점 단계명
    stage_description TEXT, -- 단계 설명
    mitre_tactic TEXT,      -- MITRE 전술
    mitre_technique TEXT,   -- MITRE 기법
    snort_rule TEXT,        -- Snort 탐지 규칙
    remediation TEXT        -- 대응 방법 (공통)
);
```

### 저장 예시

하나의 CVE에 3개의 attack_steps가 있으면 **3개의 row**로 저장:

| id | link | cve_summary | step | packet_text | vuln_stage | ... | remediation |
|----|------|-------------|------|-------------|------------|-----|-------------|
| 1  | github.com/... | FreePBX... | 1 | GET /admin... | Exploit Injection | ... | 업데이트... |
| 2  | github.com/... | FreePBX... | 2 | GET /admin... | Exploit Injection | ... | 업데이트... |
| 3  | github.com/... | FreePBX... | 3 | GET /admin... | Exploit Injection | ... | 업데이트... |

**공통 필드** (link, download_path, cve_summary, remediation)는 모든 row에 동일하게 저장됨.

## 분석 결과 조회

### SQL 예시

```sql
-- 특정 CVE의 모든 공격 단계 조회
SELECT step, vuln_stage, stage_description, snort_rule
FROM CVE_Packet_AI_Analysis
WHERE link LIKE '%CVE-2025-57819%'
ORDER BY step;

-- CVE 요약만 조회 (중복 제거)
SELECT DISTINCT link, cve_summary, remediation
FROM CVE_Packet_AI_Analysis;

-- MITRE 기법별 그룹화
SELECT mitre_technique, COUNT(*) as count
FROM CVE_Packet_AI_Analysis
WHERE mitre_technique IS NOT NULL
GROUP BY mitre_technique
ORDER BY count DESC;
```

## Rate Limit 처리

- Gemini API 토큰 제한 도달 시 **자동으로 10분 대기**
- 대기 후 자동으로 재시도
- 로그에 Rate Limit 상태 기록

## 로그 파일

- 위치: `logs/ai_analysis_YYYYMMDD.log`
- 분석 진행 상황, 오류, Rate Limit 등 기록

## 중단 및 재시작

- **중단**: `Ctrl+C`
- **재시작**: `python run_ai_analysis.py`
- 이미 분석된 항목(`AI_chk='Y'`)은 다시 분석하지 않음

## 수동 재분석

특정 CVE를 다시 분석하려면:

```sql
UPDATE Github_CVE_Info 
SET AI_chk = 'N' 
WHERE cve = 'CVE-2025-XXXXX';
```

그 후 분석기가 자동으로 재분석합니다.

## 문제 해결

### Gemini CLI를 찾을 수 없음

```bash
# gemini-cli 설치 확인
gemini --version

# 설치되지 않았다면
npm install -g @google/generative-ai-cli
```

### API 키 오류

Gemini API 키가 설정되어 있는지 확인

### 분석 실패

- 로그 파일에서 상세 오류 확인
- POC 파일이 올바르게 다운로드되었는지 확인
- CVE_Info.txt 파일이 존재하는지 확인

## 병렬 실행

두 프로그램을 동시에 실행할 수 있습니다:

### 터미널 1: CVE 수집
```bash
python main.py
```

### 터미널 2: AI 분석
```bash
python run_ai_analysis.py
```

수집기가 새로운 CVE를 추가하면, 분석기가 자동으로 분석합니다.

