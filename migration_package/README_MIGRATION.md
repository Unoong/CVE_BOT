# CVE_BOT DB 마이그레이션 패키지

이 폴더에는 **새 서버/환경으로 DB를 옮기거나 처음 설치할 때** 필요한 파일만 모아 두었습니다.  
프로젝트 전체 압축은 사용자가 따로 하시면 됩니다.

---

## 폴더 구성

| 파일 | 설명 |
|------|------|
| `001_create_database.sql` ~ `012_dashboard_tables.sql` | DB/테이블 생성 스크립트 (실행 순서 중요) |
| `013_alter_optional_columns.sql` | 기존 DB에 컬럼만 추가할 때 참고용 (주석 처리, 필요 시 수동 실행) |
| `run_migration.py` | 위 SQL을 순서대로 실행하는 Python 스크립트 |
| `config.migration.json.example` | DB 연결 설정 예시 (복사 후 `config.migration.json` 으로 사용) |
| `README_MIGRATION.md` | 이 문서 |

---

## 사전 요구 사항

- **MySQL** (MariaDB 호환) 서버가 대상 서버에 설치·실행 중이어야 합니다.
- **Python 3** + `mysql-connector-python`  
  - 설치: `pip install mysql-connector-python`

---

## 마이그레이션 방법

### 1) 설정

- **방법 A**: 프로젝트 루트에 `config.json` 이 있고 `database` 항목이 있으면, 그 설정을 그대로 사용합니다.
- **방법 B**: 이 폴더에만 설정을 두고 싶다면  
  - `config.migration.json.example` 을 복사해 `config.migration.json` 으로 저장  
  - `host`, `port`, `user`, `password`, `database` 를 대상 환경에 맞게 수정  

### 2) 실행

프로젝트 루트 또는 이 폴더에서:

```powershell
# 프로젝트 루트에서
python migration_package\run_migration.py

# 또는 migration_package 폴더 안에서
python run_migration.py
```

- `001`: 지정한 이름의 DB가 없으면 생성 (utf8mb4).
- `002`~`012`: 해당 DB에 테이블을 순서대로 생성합니다.
- `013`은 실행하지 않습니다. 기존 DB에 컬럼만 추가할 때 내용을 참고해 수동으로 실행하세요.

### 3) 타임아웃

대용량 또는 느린 환경에서는 DB 연결/실행 타임아웃이 부족할 수 있습니다.  
그럴 때는 `run_migration.py` 의 `mysql.connector.connect()` 에 `connection_timeout` 등을 넣어 조정하면 됩니다.

---

## SQL 실행 순서 (참고)

1. `001` - 데이터베이스 생성
2. `002` - Github_CVE_Info  
3. `003` - CVE_Info  
4. `004` - CVE_Packet_AI_Analysis  
5. `005` - CVE_Integrated_Data  
6. `006` - users  
7. `007` - board_posts, poc_ratings, poc_comments, poc_reanalyze_history  
8. `008` - chat_messages  
9. `009` - api_tokens  
10. `010` - AI_Quota_Management  
11. `011` - gemini_accounts, gemini_quota_usage, gemini_quota_events  
12. `012` - 대시보드 통계 테이블  
13. `013` - (선택) 기존 DB 컬럼 추가 시 수동 참고  

---

## 기존 DB에 컬럼만 추가할 때

이미 테이블은 있고, 일부 컬럼만 추가하는 경우에는 `013_alter_optional_columns.sql` 을 열어서  
필요한 `ALTER TABLE` 만 주석 해제한 뒤, MySQL 클라이언트나 워크벤치에서 직접 실행하세요.  
컬럼이 이미 있으면 에러가 나므로, 필요 시 `information_schema` 로 존재 여부를 확인한 뒤 실행하는 것이 좋습니다.

---

## 데이터 이전 (덤프/복원)

- **덤프**: 원본 서버에서  
  `mysqldump -h 호스트 -P 포트 -u 사용자 -p 데이터베이스명 > backup.sql`  
- **복원**: 대상 서버에서  
  - 먼저 이 패키지로 스키마 생성 (`run_migration.py`)  
  - 그 다음 `mysql -h ... -u ... -p 데이터베이스명 < backup.sql` 로 데이터만 넣거나,  
  - 덤프에 스키마가 포함돼 있다면 DB 생성 후 덤프 전체 복원  

---

문서 작성: 마이그레이션 패키지 구성 시점
