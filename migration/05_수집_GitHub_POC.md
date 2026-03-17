# 05. 수집 모듈 - GitHub POC

## 역할

- GitHub API로 CVE 관련 저장소 검색 후, 메타정보·README 수집 및 DB 저장, POC zip 다운로드.

## 파일

- **main.py**: 수집 오케스트레이션. 설정 로드 → DB 테이블 확인 → GitHubCollector로 검색 → 저장소별 처리(DB 저장, 다운로드).
- **github_collector.py**: `GitHubCollector` 클래스. 토큰(또는 토큰 리스트)으로 API 호출, Rate Limit 대응(최소 10초 딜레이 등).
- **file_manager.py**: zip 다운로드 및 압축 해제, `download_path` 생성.
- **db_manager.py**: `Github_CVE_Info` 삽입, `get_cve_count`, 테이블 생성 등.
- **config_loader.py**: `config.json` 등 로드.

## 설정 (config.json)

- **database**: host, port, user, password, database.
- **collection**:
  - `max_cve_per_item`: CVE당 기본 최대 POC 수(예: 5).
  - `cve_specific_limits`: CVE 코드별 최대 개수 오버라이드.
- GitHub 토큰: 설정 또는 환경에서 `GITHUB_TOKEN` / 토큰 리스트. (github_collector는 토큰 리스트 지원.)

## DB 저장 필드 (Github_CVE_Info)

- date, collect_time, link, title, writer, cve, readme, download_path, status, trans_msg, AI_chk, cve_info_status 등.
- `AI_chk`: 'N' 미분석, 'Y' 분석 완료.
- `cve_info_status`: CVE 상세 수집 여부.
- `status`: 외부 전송 여부(예: 'N'/'Y').

## 세부 동작

1. **main.py**에서 `load_config()` → `get_db_connection()` → `create_table()` / `create_cve_info_table()` 등.
2. **GitHubCollector**로 연도/키워드 조건 검색(설정에 따라 페이지 제한 등).
3. 각 저장소에 대해:
   - CVE 코드 추출.
   - `get_cve_count()`로 해당 CVE 이미 수집 개수 확인 → `get_max_poc_limit()` 이하면 진행.
   - DB 삽입(`insert_cve_data`), 필요 시 `download_and_extract_zip`, `get_next_index`.
4. **translator**로 README 번역 시 `trans_msg` 등 저장(설정에 따라).

## 실행

- `python main.py` (설정/토큰 준비 후).
