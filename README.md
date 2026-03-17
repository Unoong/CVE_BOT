# CVE Bot - GitHub CVE 정보 수집 및 AI 분석 시스템

GitHub에서 CVE(Common Vulnerabilities and Exposures) 정보를 자동으로 수집하고, Gemini AI를 사용하여 POC를 분석하는 통합 시스템입니다.

## 주요 기능

### 📥 CVE 수집 (`main.py`)
- **GitHub API 검색**: GitHub API를 사용하여 CVE 관련 Python 저장소 검색 (최신순)
- **자동 데이터 수집**: 작성일, 작성자, CVE 코드, README 등 자동 수집
- **CVE API 수집**: CVE 상세 정보 자동 수집 (CVSS, CWE 등)
- **데이터베이스 저장**: MySQL 데이터베이스에 실시간 저장
- **중복 방지**: 동일 링크 및 CVE는 최대 5개까지만 저장
- **ZIP 다운로드**: GitHub 저장소를 ZIP으로 다운로드 및 압축 해제
- **번역 기능**: README와 CVE 설명을 한국어로 번역 (Google Translate 무료)
- **Rate Limit 처리**: GitHub API Rate Limit 자동 감지 및 대기
- **로깅**: 상세한 로그 파일 생성

### 🤖 AI 분석 (`run_ai_analysis.py`)
- **자동 POC 분석**: Gemini AI가 POC 코드 자동 분석
- **공격 단계 추출**: POC에서 공격 단계별 패킷 추출
- **MITRE 매핑**: MITRE ATT&CK 프레임워크에 매핑
- **Snort 규칙 생성**: 각 공격 단계별 탐지 규칙 자동 생성
- **10분마다 자동 실행**: 새로운 CVE 자동 분석

## 설치 방법

1. 프로젝트 클론 또는 다운로드
```bash
cd E:\LLama\pythonProject\CVE_BOT
```

2. 필요한 패키지 설치
```bash
pip install -r requirements.txt
```

3. MySQL 데이터베이스 설정
   - 포트: 7002
   - 데이터베이스: TOTORO
   - 사용자: root
   - 비밀번호: !db8354

## 설정 파일 (config.json)

```json
{
    "github": {
        "token": "YOUR_GITHUB_TOKEN",
        "search_query": "CVE-{year} language:python",
        "max_pages": 100
    },
    "database": {
        "host": "localhost",
        "port": 7002,
        "user": "root",
        "password": "!db8354",
        "database": "TOTORO"
    },
    "collection": {
        "last_collection_time": "",
        "max_cve_per_item": 5,
        "rate_limit_wait_minutes": 10
    }
}
```

### 설정 항목 설명

- **github.token**: GitHub Personal Access Token
- **github.max_pages**: 검색할 최대 페이지 수 (기본: 100)
- **collection.last_collection_time**: 마지막 수집 시간 (자동 업데이트)
- **collection.max_cve_per_item**: CVE당 최대 저장 개수 (기본: 5)
- **collection.rate_limit_wait_minutes**: Rate Limit 시 대기 시간 (기본: 10분)

## 사용 방법

### 1. CVE 수집 실행

```bash
cd E:\LLama\pythonProject\CVE_BOT
python main.py
```

### 2. AI 분석 실행 (별도 터미널)

```bash
cd E:\LLama\pythonProject\CVE_BOT
python run_ai_analysis.py
```

### 병렬 실행 권장

- **터미널 1**: `main.py` (CVE 수집)
- **터미널 2**: `run_ai_analysis.py` (AI 분석)

수집과 분석을 동시에 실행하면 효율적입니다!

## 프로젝트 구조

```
CVE_BOT/
├── main.py                 # 메인 실행 파일
├── config.json            # 설정 파일
├── logger.py              # 로깅 모듈
├── db_manager.py          # 데이터베이스 관리 모듈
├── github_collector.py    # GitHub API 수집 모듈
├── translator.py          # Papago 번역 모듈
├── file_manager.py        # 파일 관리 모듈
├── requirements.txt       # 패키지 의존성
├── CVE/                   # CVE 저장소 다운로드 폴더
│   └── CVE-YYYY-NNNNN/   # CVE별 폴더
│       ├── 1/            # 첫 번째 저장소
│       ├── 2/            # 두 번째 저장소
│       └── ...
└── logs/                  # 로그 파일 폴더
    └── cve_bot_YYYYMMDD.log
```

## 데이터베이스 스키마

```sql
CREATE TABLE IF NOT EXISTS Github_CVE_Info (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date TEXT,              -- 저장소 작성일
    collect_time TEXT,      -- 수집 시간
    link TEXT,              -- GitHub 링크
    title TEXT,             -- 저장소 제목
    writer TEXT,            -- 작성자
    cve TEXT,               -- CVE 코드
    readme TEXT,            -- README 원문
    download_path TEXT,     -- 다운로드 경로
    status TEXT,            -- 상태 (기본: N)
    trans_msg TEXT,         -- 번역된 메시지
    AI_chk TEXT            -- AI 체크 여부 (기본: N)
)
```

## 수집 항목

1. **date**: 저장소 생성 날짜
2. **collect_time**: 데이터 수집 시간
3. **writer**: 저장소 작성자
4. **cve**: CVE 코드
5. **title**: GitHub 저장소 제목
6. **link**: GitHub 저장소 링크
7. **readme**: README 파일 내용
8. **download_path**: ZIP 파일 다운로드 경로
9. **status**: 처리 상태 (기본: N)
10. **trans_msg**: 번역된 README
11. **AI_chk**: AI 체크 여부 (기본: N)

## 주요 로직

1. **CVE 개수 제한**: DB에서 동일한 CVE 코드를 가진 레코드를 조회하여 5개 미만일 때만 저장
2. **CVE 코드 추출**: 저장소 제목, 설명, README에서 정규식으로 CVE-YYYY-NNNNN 패턴 추출
3. **최신순 정렬**: GitHub API의 updated 기준으로 최신순 정렬
4. **중복 방지**: 마지막 수집 시간 이후의 업데이트된 저장소만 수집
5. **ZIP 다운로드**: CVE 폴더 구조에 맞춰 저장소 다운로드 및 압축 해제

## 주의사항

- **GitHub API Rate Limit**: 시간당 5,000 요청 (인증된 요청 기준)
- **Rate Limit 처리**: 도달 시 자동으로 10분 대기 후 재시도
- **CVE 저장 제한**: DB 조회 기준으로 동일 CVE는 최대 5개까지만 저장
- **Papago 번역**: API 키가 설정되지 않은 경우 원본 텍스트 저장
- **검색 쿼리**: `CVE-{현재년도} language:python`으로 검색

## Papago 번역 설정 (선택사항)

Papago API를 사용하려면 `translator.py`를 수정하고 config.json에 API 키를 추가하세요:

```json
"papago": {
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET"
}
```

## 로그 파일

- 위치: `logs/cve_bot_YYYYMMDD.log`
- 형식: 날짜별 로그 파일 생성
- 레벨: DEBUG, INFO, WARNING, ERROR, CRITICAL

## 라이선스

이 프로젝트는 교육 및 연구 목적으로 제작되었습니다.

## 문제 해결

### 데이터베이스 연결 오류
- MySQL 서버가 실행 중인지 확인
- 포트 7002가 올바른지 확인
- 데이터베이스 TOTORO가 생성되어 있는지 확인

### GitHub API Rate Limit
- GitHub Token이 유효한지 확인
- Rate Limit 상태 확인: https://api.github.com/rate_limit

### ZIP 다운로드 실패
- 네트워크 연결 확인
- 저장소가 public인지 확인
- 디스크 공간 확인

