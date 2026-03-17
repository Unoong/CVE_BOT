# 06. 수집 모듈 - CIRCL CVE

## 역할

- CIRCL Vulnerability-Lookup API를 통해 최근 업데이트된 CVE(CSAF 형식) 목록을 가져와 `CVE_Info`에 저장.

## 파일

- **circl_cve_collector.py**: API 호출, CSAF 파싱, DB 삽입, 로깅.
- **db_manager.py**: `get_db_connection`, `create_cve_info_table`, `check_cve_info_exists`, `insert_cve_info`.

## API

- **Base**: `https://vulnerability.circl.lu/api`
- **최근 CVE**: `GET {API_BASE}/last/{limit}` (limit 기본 100, 권장 최대 100).

## 설정

- **config.json**: 루트에 있으면 로드. `database`로 DB 연결.
- **DEFAULT_LIMIT**: 한 번에 가져올 CSAF 문서 개수(기본 100).

## 로그

- `logs/circl_collector.log` (TimedRotating, 일별, backupCount 14).

## 처리 흐름

1. `load_config()` → DB 연결.
2. `fetch_last_cves(limit)`로 CSAF 목록 조회.
3. 각 문서에서 CVE 코드·상태·날짜·제품·설명·CVSS·해결방안 등 파싱.
4. `check_cve_info_exists(conn, cve_code)` 후 없으면(또는 업데이트 정책에 따라) `insert_cve_info(conn, cve_info)`.

## 실행

- `run_circl_collector.bat` 또는 `python circl_cve_collector.py` (실행 진입점이 스크립트 내에 있을 수 있음).
