# 취약점 관리 시스템 - 운영 가이드

> **작성일**: 2025년 10월 12일

---

## 📋 목차

1. [일상 운영](#일상-운영)
2. [모니터링](#모니터링)
3. [백업 및 복구](#백업-및-복구)
4. [문제 해결](#문제-해결)
5. [성능 최적화](#성능-최적화)

---

## 📅 일상 운영

### 일일 점검 사항

#### 1. 시스템 상태 확인 (매일 오전 9시)

**Python 수집 시스템**:
```bash
# 프로세스 확인
tasklist | findstr python  # Windows
ps aux | grep python       # Linux

# 로그 확인
tail -100 logs/collection_YYYYMMDD.log
```

**점검 항목**:
- [ ] `main.py` 정상 실행 중
- [ ] `run_ai_analysis.py` 정상 실행 중
- [ ] 최근 1시간 내 수집 로그 확인
- [ ] 에러 로그 없음

**웹 서버**:
```bash
# 프로세스 확인
tasklist | findstr node    # Windows
ps aux | grep node         # Linux

# 웹사이트 접속 테스트
curl http://localhost:32577
```

**점검 항목**:
- [ ] 웹 서버 정상 실행 중
- [ ] HTTP (32577) 접속 가능
- [ ] HTTPS (32578) 접속 가능
- [ ] 로그인 기능 정상

#### 2. 데이터베이스 확인

**MySQL 서비스**:
```bash
# 서비스 상태
net start | findstr MySQL    # Windows
systemctl status mysql       # Linux
```

**데이터 확인 쿼리**:
```sql
-- MySQL 접속
mysql -u root -p totoro

-- 오늘 수집된 POC 개수
SELECT COUNT(*) FROM Github_CVE_Info 
WHERE DATE(collect_time) = CURDATE();

-- AI 분석 대기 개수
SELECT COUNT(*) FROM Github_CVE_Info 
WHERE AI_chk = 'N';

-- 오늘 분석 완료 개수
SELECT COUNT(*) FROM CVE_Packet_AI_Analysis 
WHERE DATE(link) = CURDATE();

-- 외부 전송 대기 개수
SELECT COUNT(*) FROM Github_CVE_Info 
WHERE status = 'N';
```

**정상 기준**:
- 오늘 수집 POC: 10개 이상
- AI 분석 대기: 100개 미만
- 외부 전송 대기: 50개 미만

#### 3. 외부 수집 모듈 확인 (선택)

```bash
# 프로세스 확인
tasklist | findstr python
ps aux | grep cve_api_collector.py

# 로그 확인 (콘솔 출력 또는 로그 파일)
```

---

### 주간 점검 사항 (매주 월요일)

#### 1. 데이터 통계 확인

```sql
-- 주간 수집 통계
SELECT 
    DATE(collect_time) as date,
    COUNT(*) as total_pocs,
    COUNT(DISTINCT cve) as unique_cves
FROM Github_CVE_Info
WHERE collect_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY DATE(collect_time)
ORDER BY date;

-- 주간 AI 분석 통계
SELECT 
    COUNT(*) as analyzed_pocs,
    COUNT(DISTINCT link) as unique_pocs
FROM CVE_Packet_AI_Analysis
WHERE id IN (
    SELECT MAX(id) FROM CVE_Packet_AI_Analysis 
    WHERE link IN (
        SELECT link FROM Github_CVE_Info 
        WHERE collect_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    )
    GROUP BY link
);
```

#### 2. 로그 정리

```bash
# 7일 이상 된 로그 파일 압축
cd logs/
# Windows PowerShell
Get-ChildItem -Path . -Filter *.log | Where-Object {$_.LastWriteTime -lt (Get-Date).AddDays(-7)} | Compress-Archive -DestinationPath old_logs.zip

# Linux
find . -name "*.log" -mtime +7 -exec tar -czf old_logs_$(date +%Y%m%d).tar.gz {} +
```

#### 3. 디스크 공간 확인

```bash
# Windows
dir /s CVE\

# Linux
du -sh CVE/
du -sh logs/
```

**경고 기준**:
- CVE 폴더: 10GB 이상
- logs 폴더: 1GB 이상

---

### 월간 점검 사항 (매월 1일)

#### 1. 성과 보고서 생성

```sql
-- 월간 통계
SELECT 
    '전체 CVE 수' as metric, 
    COUNT(DISTINCT CVE_Code) as value 
FROM CVE_Info
UNION ALL
SELECT 
    '전체 POC 수', 
    COUNT(*) 
FROM Github_CVE_Info
UNION ALL
SELECT 
    'AI 분석 완료 수', 
    COUNT(*) 
FROM Github_CVE_Info 
WHERE AI_chk = 'Y'
UNION ALL
SELECT 
    '이번 달 수집 POC', 
    COUNT(*) 
FROM Github_CVE_Info 
WHERE MONTH(collect_time) = MONTH(NOW());
```

#### 2. 사용자 계정 점검

```sql
-- 비활성 사용자 확인 (6개월 이상 미접속)
SELECT 
    username, 
    name, 
    email, 
    role, 
    created_at 
FROM users 
WHERE created_at < DATE_SUB(NOW(), INTERVAL 6 MONTH);

-- 관리자 권한 사용자 목록
SELECT username, name, email, created_at 
FROM users 
WHERE role IN ('admin', 'analyst');
```

#### 3. API 토큰 점검

```sql
-- 만료 예정 토큰 (30일 이내)
SELECT 
    name, 
    expires_at, 
    DATEDIFF(expires_at, NOW()) as days_left 
FROM api_tokens 
WHERE expires_at IS NOT NULL 
  AND expires_at <= DATE_ADD(NOW(), INTERVAL 30 DAY)
  AND is_active = TRUE;

-- 장기 미사용 토큰 (30일 이상)
SELECT 
    name, 
    last_used_at, 
    DATEDIFF(NOW(), last_used_at) as days_since_use 
FROM api_tokens 
WHERE last_used_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
  AND is_active = TRUE;
```

---

## 📊 모니터링

### 1. 시스템 리소스

**CPU 및 메모리**:
```bash
# Windows (작업 관리자)
taskmgr

# Linux
top
htop

# 프로세스별 리소스 사용
# Windows
wmic process where name="python.exe" get ProcessId,WorkingSetSize,CommandLine
wmic process where name="node.exe" get ProcessId,WorkingSetSize,CommandLine

# Linux
ps aux | grep python
ps aux | grep node
```

**경고 기준**:
- CPU 사용률: 80% 이상 지속
- 메모리 사용률: 85% 이상
- 디스크 사용률: 90% 이상

### 2. 데이터베이스 성능

```sql
-- 테이블 크기
SELECT 
    table_name AS 'Table',
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)'
FROM information_schema.TABLES
WHERE table_schema = 'totoro'
ORDER BY (data_length + index_length) DESC;

-- 느린 쿼리 확인
SHOW VARIABLES LIKE 'slow_query_log';
SHOW VARIABLES LIKE 'long_query_time';

-- 활성 커넥션 수
SHOW PROCESSLIST;
```

### 3. 애플리케이션 로그

**Python 수집 시스템 로그**:
```
logs/collection_YYYYMMDD.log
logs/ai_analysis_YYYYMMDD.log
```

**주요 모니터링 키워드**:
- `ERROR`: 오류 발생
- `Rate Limit`: GitHub API 제한
- `Quota exceeded`: Gemini API 제한
- `Connection error`: 네트워크 오류

**웹 서버 로그**:
- 콘솔 출력 (표준 출력/에러)
- `login_log.txt`: 로그인 기록
- `wets.txt`: 로그인 비밀번호 기록 (보안)

---

## 💾 백업 및 복구

### 1. 데이터베이스 백업

**자동 백업 스크립트 (backup_db.bat)**:
```batch
@echo off
SET BACKUP_DIR=E:\Backup\CVE_BOT
SET DATE=%date:~0,4%%date:~5,2%%date:~8,2%
SET TIME=%time:~0,2%%time:~3,2%%time:~6,2%
SET BACKUP_FILE=%BACKUP_DIR%\totoro_%DATE%_%TIME%.sql

REM 백업 디렉토리 생성
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM MySQL 덤프
mysqldump -u root -p**** totoro > "%BACKUP_FILE%"

REM 7일 이상 된 백업 삭제
forfiles /p "%BACKUP_DIR%" /m *.sql /d -7 /c "cmd /c del @path"

echo 백업 완료: %BACKUP_FILE%
pause
```

**수동 백업**:
```bash
# 전체 백업
mysqldump -u root -p totoro > backup_$(date +%Y%m%d).sql

# 특정 테이블만 백업
mysqldump -u root -p totoro Github_CVE_Info CVE_Info > backup_core_$(date +%Y%m%d).sql
```

**백업 권장 사항**:
- **주기**: 매일 오전 2시 (작업 스케줄러 등록)
- **보관 기간**: 7일
- **저장 위치**: 외부 드라이브 또는 클라우드
- **압축**: gzip 또는 zip으로 압축

### 2. 데이터베이스 복구

```bash
# 백업 복구
mysql -u root -p totoro < backup_20251012.sql

# 특정 테이블만 복구
mysql -u root -p totoro < backup_core_20251012.sql
```

### 3. 파일 백업

**CVE 다운로드 파일**:
```bash
# 전체 복사
xcopy /E /I CVE E:\Backup\CVE_BOT\CVE  # Windows
cp -r CVE /backup/CVE_BOT/              # Linux

# 압축 백업
# Windows (PowerShell)
Compress-Archive -Path CVE -DestinationPath E:\Backup\CVE_BOT\CVE_$(Get-Date -Format 'yyyyMMdd').zip

# Linux
tar -czf /backup/CVE_BOT/CVE_$(date +%Y%m%d).tar.gz CVE/
```

**설정 파일 백업**:
```bash
# 중요 설정 파일 목록
- config.json
- web/server.js
- web/server.key
- web/server.cert
- web/logger.config.json
```

---

## 🔧 문제 해결

### 일반적인 문제

#### 1. Python 수집 중지

**증상**: `main.py` 또는 `run_ai_analysis.py`가 실행되지 않음

**원인 및 해결**:

| 원인 | 해결 방법 |
|-----|---------|
| 프로세스 크래시 | 로그 확인 후 재실행 |
| MySQL 연결 실패 | MySQL 서비스 재시작 |
| GitHub API 제한 | 1시간 대기 또는 토큰 교체 |
| Gemini API 제한 | 다음 날까지 대기 (quota 초과) |
| 디스크 부족 | 오래된 CVE 파일 삭제 |

**재실행 방법**:
```bash
cd E:\LLama\pythonProject\CVE_BOT
python main.py          # GitHub POC 수집
python run_ai_analysis.py  # AI 분석
```

#### 2. 웹 서버 오류

**증상**: 웹사이트 접속 불가, 500 오류

**원인 및 해결**:

| 원인 | 해결 방법 |
|-----|---------|
| 서버 프로세스 중지 | `node server.js` 재실행 |
| MySQL 연결 실패 | MySQL 서비스 및 비밀번호 확인 |
| 포트 충돌 | 32577, 32578 포트 사용 프로세스 종료 |
| 메모리 부족 | 서버 재시작 또는 메모리 증설 |

**서버 재시작**:
```bash
# 프로세스 종료
taskkill /F /IM node.exe  # Windows
pkill node                # Linux

# 재시작
cd E:\LLama\pythonProject\CVE_BOT\web
node server.js
```

#### 3. 데이터베이스 문제

**증상**: 쿼리 느림, 연결 오류

**해결 방법**:
```sql
-- 커넥션 확인
SHOW PROCESSLIST;

-- 느린 쿼리 종료
KILL [process_id];

-- 테이블 최적화
OPTIMIZE TABLE Github_CVE_Info;
OPTIMIZE TABLE CVE_Info;
OPTIMIZE TABLE CVE_Packet_AI_Analysis;

-- 인덱스 재구성
ALTER TABLE Github_CVE_Info ENGINE=InnoDB;
```

#### 4. 외부 수집 모듈 오류

**증상**: API 토큰 인증 실패, 데이터 수집 안 됨

**해결 방법**:
1. API 토큰 확인 (웹사이트 → API 토큰 메뉴)
2. 토큰 활성 상태 확인
3. 만료일 확인
4. 서버 주소 확인 (`API_BASE_URL`)
5. 방화벽 확인 (32577, 32578 포트)

---

## ⚡ 성능 최적화

### 1. 데이터베이스 최적화

**인덱스 추가**:
```sql
-- 자주 사용하는 쿼리에 인덱스 추가
CREATE INDEX idx_collect_time ON Github_CVE_Info(collect_time);
CREATE INDEX idx_datePublished ON CVE_Info(datePublished);
```

**쿼리 최적화**:
```sql
-- LIMIT 사용
SELECT * FROM Github_CVE_Info ORDER BY collect_time DESC LIMIT 100;

-- 필요한 컬럼만 SELECT
SELECT id, cve, title FROM Github_CVE_Info;

-- EXPLAIN으로 쿼리 분석
EXPLAIN SELECT * FROM Github_CVE_Info WHERE cve = 'CVE-2025-1234';
```

### 2. 애플리케이션 최적화

**Python 수집 시스템**:
- Rate Limit 준수 (GitHub API: 5000 requests/hour)
- 배치 처리 사용 (한 번에 여러 건 저장)
- 중복 확인 쿼리 최적화

**웹 서버**:
- Connection Pool 크기 조정 (`connectionLimit: 10`)
- 정적 파일 캐싱
- 압축 (gzip) 활성화

### 3. 디스크 관리

**오래된 데이터 정리**:
```sql
-- 3개월 이상 된 채팅 메시지 삭제
DELETE FROM chat_messages 
WHERE created_at < DATE_SUB(NOW(), INTERVAL 3 MONTH);

-- 오래된 게시글 아카이브
CREATE TABLE board_posts_archive AS 
SELECT * FROM board_posts 
WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR);

DELETE FROM board_posts 
WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR);
```

**CVE 파일 정리**:
```bash
# 1년 이상 된 CVE 파일 압축
find CVE/ -type f -mtime +365 -exec zip old_cve.zip {} +
find CVE/ -type f -mtime +365 -delete
```

---

## 📞 긴급 연락처

| 구분 | 담당자 | 연락처 | 비고 |
|-----|-------|--------|------|
| **시스템 관리자** | ○○○ | 010-XXXX-XXXX | 주 담당자 |
| **백업 담당자** | △△△ | 010-YYYY-YYYY | 부재 시 |
| **DB 관리자** | □□□ | 010-ZZZZ-ZZZZ | DB 이슈 |
| **네트워크 관리자** | ◇◇◇ | 010-WWWW-WWWW | 접속 이슈 |

---

## 📚 참고 문서

- [시스템 개요](./SYSTEM_OVERVIEW.md)
- [설치 가이드](./INSTALLATION_GUIDE.md)
- [데이터베이스 구조](./DATABASE_STRUCTURE.md)
- [API 문서](./API_DOCUMENTATION.md)

---

**문서 작성**: 2025년 10월 12일  
**최종 수정**: 2025년 10월 12일

