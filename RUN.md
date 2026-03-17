# CVE Bot 실행 가이드

## 빠른 시작

### 1. 패키지 설치
```bash
cd E:\LLama\pythonProject\CVE_BOT
pip install -r requirements.txt
```

### 2. 데이터베이스 확인
- MySQL 서버가 실행 중인지 확인
- 포트 7002에서 TOTORO 데이터베이스 접근 가능 확인

### 3. 프로그램 실행
```bash
python main.py
```

## 설정 변경

`config.json` 파일에서 다음 항목을 수정할 수 있습니다:

- **max_pages**: 검색할 페이지 수 (기본: 100)
- **max_cve_per_item**: CVE당 최대 저장 개수 (기본: 5)
- **rate_limit_wait_minutes**: Rate Limit 시 대기 시간 (기본: 10분)

## 로그 확인

로그 파일은 `logs/` 폴더에 날짜별로 생성됩니다:
```
logs/cve_bot_20251007.log
```

## 수집된 데이터 확인

### DB 조회
```sql
-- 모든 CVE 데이터 조회
SELECT * FROM Github_CVE_Info;

-- CVE별 개수 조회
SELECT cve, COUNT(*) as count 
FROM Github_CVE_Info 
GROUP BY cve 
ORDER BY count DESC;

-- 최근 수집된 데이터 조회
SELECT * FROM Github_CVE_Info 
ORDER BY collect_time DESC 
LIMIT 10;
```

### 다운로드된 파일 확인
```
CVE/
├── CVE-2025-12345/
│   ├── 1/  (첫 번째 저장소)
│   ├── 2/  (두 번째 저장소)
│   └── ...
└── CVE-2025-67890/
    └── 1/
```

## 문제 해결

### 데이터가 수집되지 않을 때
1. GitHub 토큰이 유효한지 확인
2. 로그 파일에서 오류 메시지 확인
3. GitHub API Rate Limit 확인
4. 네트워크 연결 확인

### Rate Limit 오류
- 현재 Rate Limit 상태 확인: https://api.github.com/rate_limit
- 자동으로 10분 대기 후 재시도됨
- config.json에서 `rate_limit_wait_minutes` 조정 가능

### DB 연결 오류
- MySQL 서버 상태 확인
- 포트 7002 사용 가능 확인
- TOTORO 데이터베이스 존재 확인
- 계정 정보 확인 (root / !db8354)

## 마지막 수집 시간 초기화

모든 데이터를 다시 수집하려면 `config.json`의 `last_collection_time`을 빈 문자열로 변경:

```json
"collection": {
    "last_collection_time": "",
    ...
}
```

## 프로그램 중단

- `Ctrl+C`를 눌러 안전하게 중단
- DB 연결 자동 종료
- 마지막 수집 시간 자동 저장

