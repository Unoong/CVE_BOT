# CVE Bot 사용 가이드

## 🚀 빠른 시작

### 1단계: 패키지 설치
```bash
cd E:\LLama\pythonProject\CVE_BOT
pip install -r requirements.txt
```

### 2단계: CVE 수집 실행
```bash
python main.py
```

### 3단계: AI 분석 실행 (별도 터미널)
```bash
python run_ai_analysis.py
```

## 📊 시스템 구성

### 프로그램 1: CVE 수집기 (`main.py`)
- GitHub에서 CVE POC 검색 및 수집
- CVE API에서 상세 정보 수집
- ZIP 다운로드 및 압축 해제
- 실시간 DB 저장

### 프로그램 2: AI 분석기 (`run_ai_analysis.py`)
- 10분마다 자동 실행
- AI_chk='N'인 항목 자동 분석
- Gemini AI로 POC 분석
- 공격 단계별 패킷 추출
- Snort 규칙 자동 생성

## 💾 데이터베이스 테이블

### 1. Github_CVE_Info
- GitHub POC 정보 저장
- CVE별 최대 5개까지 저장
- `AI_chk` 필드로 분석 여부 관리

### 2. CVE_Info
- CVE 상세 정보 (CVSS, CWE 등)
- CVE API에서 수집
- `CVE_Code` UNIQUE 제약

### 3. CVE_Packet_AI_Analysis
- Gemini AI 분석 결과
- 공격 단계별 분리 저장
- MITRE ATT&CK, Snort 규칙 포함

## 📁 파일 구조

```
E:\LLama\pythonProject\CVE_BOT\
├── main.py                     # CVE 수집 메인
├── run_ai_analysis.py          # AI 분석 메인 (10분 반복)
├── config.json                 # 설정
├── logger.py                   # 로깅 시스템
├── db_manager.py               # DB 관리
├── github_collector.py         # GitHub API
├── cve_info_collector.py       # CVE API
├── ai_analyzer.py              # Gemini AI 분석
├── translator.py               # Google 번역
├── file_manager.py             # ZIP 관리
├── requirements.txt            # 패키지 목록
├── README.md                   # 전체 가이드
├── AI_ANALYSIS_README.md       # AI 분석 가이드
├── CVE/                        # CVE POC 저장
│   └── CVE-XXXX-XXXXX/
│       ├── 1/
│       │   ├── repo-main/
│       │   │   ├── CVE_Info.txt  ⭐ CVE API 정보
│       │   │   └── (POC 파일들)
│       │   └── ...
│       ├── 2/
│       └── ...
└── logs/                       # 로그 폴더
    ├── cve_bot_YYYYMMDD.log
    └── ai_analysis_YYYYMMDD.log
```

## ⚙️ 설정 (config.json)

```json
{
    "github": {
        "max_pages": 5  // 테스트용 5페이지, 실제는 100으로 변경
    },
    "collection": {
        "max_cve_per_item": 5,  // CVE별 최대 개수
        "rate_limit_wait_minutes": 10
    }
}
```

## 🔍 데이터 조회 예시

### Github_CVE_Info 조회
```sql
-- 전체 개수
SELECT COUNT(*) FROM Github_CVE_Info;

-- CVE별 개수
SELECT cve, COUNT(*) as cnt 
FROM Github_CVE_Info 
GROUP BY cve 
ORDER BY cnt DESC;

-- 미분석 항목
SELECT cve, title, link 
FROM Github_CVE_Info 
WHERE AI_chk = 'N';
```

### CVE_Packet_AI_Analysis 조회
```sql
-- 특정 CVE의 공격 단계
SELECT step, vuln_stage, stage_description, snort_rule
FROM CVE_Packet_AI_Analysis
WHERE link LIKE '%CVE-2025-57819%'
ORDER BY step;

-- MITRE 기법별 통계
SELECT mitre_technique, COUNT(*) as cnt
FROM CVE_Packet_AI_Analysis
WHERE mitre_technique IS NOT NULL
GROUP BY mitre_technique
ORDER BY cnt DESC;
```

## 🛠️ 문제 해결

### Gemini CLI를 찾을 수 없음
```bash
# gemini 확인
where gemini

# 설치
npm install -g @google/generative-ai-cli
```

### DB 연결 오류
- MySQL 서버 실행 확인
- 포트 7002 확인
- TOTORO 데이터베이스 존재 확인

### Rate Limit
- GitHub API: 시간당 5,000 요청
- Gemini API: 제한 도달 시 자동 10분 대기

## 📝 로그 확인

```bash
# 수집 로그
Get-Content logs\cve_bot_20251008.log -Tail 50

# AI 분석 로그
Get-Content logs\ai_analysis_20251008.log -Tail 50
```

## 🔄 재실행

### 전체 재수집
```json
// config.json
"last_collection_time": ""  // 빈 문자열로 변경
```

### 재분석
```sql
UPDATE Github_CVE_Info SET AI_chk = 'N' WHERE cve = 'CVE-2025-XXXXX';
```

## 🎯 권장 운영 방식

1. **초기 수집**: `python main.py` 실행 (1회)
2. **AI 분석 시작**: `python run_ai_analysis.py` 백그라운드 실행
3. **정기 수집**: cron/스케줄러로 `main.py` 주기적 실행
4. **AI 분석기**: 계속 실행 상태 유지 (10분마다 자동 체크)

## ⚠️ 주의사항

- Gemini API 키가 필요합니다
- 번역은 무료 Google Translate 사용
- CVE별 최대 5개까지만 저장됨
- 동일 링크는 중복 저장되지 않음

