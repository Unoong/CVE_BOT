# 취약점 관리 시스템 - 데이터베이스 구조

> **작성일**: 2025년 10월 12일

---

## 📋 목차

1. [데이터베이스 개요](#데이터베이스-개요)
2. [테이블 구조](#테이블-구조)
3. [ERD (개체 관계도)](#erd-개체-관계도)
4. [인덱스 및 최적화](#인덱스-및-최적화)

---

## 🗄️ 데이터베이스 개요

### 기본 정보

| 항목 | 값 |
|-----|-----|
| **데이터베이스명** | `totoro` |
| **문자 인코딩** | `utf8mb4` |
| **Collation** | `utf8mb4_unicode_ci` |
| **엔진** | `InnoDB` |
| **총 테이블 수** | 10개 |

### 테이블 목록

| 번호 | 테이블명 | 용도 | 레코드 수 (예상) |
|-----|---------|------|-----------------|
| 1 | `Github_CVE_Info` | GitHub POC 정보 | 수만 건 |
| 2 | `CVE_Info` | CVE 상세 정보 | 수천 건 |
| 3 | `CVE_Packet_AI_Analysis` | AI 분석 결과 | 수만 건 |
| 4 | `CVE_Integrated_Data` | 통합 데이터 | 수만 건 |
| 5 | `users` | 사용자 정보 | 수십 건 |
| 6 | `board_posts` | 게시판 글 | 수백 건 |
| 7 | `chat_messages` | 채팅 메시지 | 수천 건 |
| 8 | `api_tokens` | API 토큰 | 수십 건 |
| 9 | `email_verifications` | 이메일 인증 | 수백 건 (임시) |
| 10 | `login_log.txt` | 로그인 로그 | 파일 |

---

## 📊 테이블 구조

### 1. Github_CVE_Info

GitHub에서 수집한 POC(Proof of Concept) 정보를 저장합니다.

**테이블 생성 SQL**:
```sql
CREATE TABLE Github_CVE_Info (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date TEXT,
    collect_time TEXT,
    link TEXT,
    title TEXT,
    writer TEXT,
    cve TEXT,
    readme LONGTEXT,
    download_path TEXT,
    status TEXT DEFAULT 'N',
    trans_msg LONGTEXT,
    AI_chk TEXT DEFAULT 'N',
    cve_info_status TEXT DEFAULT 'N',
    INDEX idx_cve (cve(255)),
    INDEX idx_link (link(255)),
    INDEX idx_AI_chk (AI_chk(1)),
    INDEX idx_status (status(1)),
    INDEX idx_cve_info_status (cve_info_status(1))
);
```

**필드 설명**:

| 필드명 | 타입 | 설명 | 예시 값 |
|-------|------|------|---------|
| `id` | INT | 고유 ID (자동 증가) | `1`, `2`, `3` |
| `date` | TEXT | POC 작성 날짜 | `2025-01-15` |
| `collect_time` | TEXT | 수집 시간 | `2025-10-12 10:30:00` |
| `link` | TEXT | GitHub 저장소 링크 | `https://github.com/user/repo` |
| `title` | TEXT | 저장소 제목 | `CVE-2025-1234 RCE Exploit` |
| `writer` | TEXT | 작성자 | `security_researcher` |
| `cve` | TEXT | CVE 코드 | `CVE-2025-1234` |
| `readme` | LONGTEXT | README 원문 | `# Exploit for CVE-2025-1234...` |
| `download_path` | TEXT | 다운로드 경로 | `CVE/CVE-2025-1234/1` |
| `status` | TEXT | 외부 전송 상태 | `N` (미전송), `Y` (전송 완료) |
| `trans_msg` | LONGTEXT | 번역된 README | `# CVE-2025-1234 익스플로잇...` |
| `AI_chk` | TEXT | AI 분석 완료 여부 | `N` (미분석), `Y` (분석 완료) |
| `cve_info_status` | TEXT | CVE 정보 수집 여부 | `N` (미수집), `Y` (수집 완료) |

**인덱스**:
- `idx_cve`: CVE 코드로 빠른 검색
- `idx_link`: 중복 확인용
- `idx_AI_chk`: AI 분석 대상 필터링
- `idx_status`: 외부 전송 대상 필터링
- `idx_cve_info_status`: CVE 정보 수집 대상 필터링

**주요 쿼리**:
```sql
-- AI 분석 대기 목록
SELECT * FROM Github_CVE_Info WHERE AI_chk = 'N' LIMIT 10;

-- 외부 전송 대기 목록
SELECT * FROM Github_CVE_Info WHERE status = 'N' LIMIT 50;

-- 특정 CVE의 POC 목록
SELECT * FROM Github_CVE_Info WHERE cve = 'CVE-2025-1234';
```

---

### 2. CVE_Info

공식 CVE API에서 수집한 상세 취약점 정보를 저장합니다.

**테이블 생성 SQL**:
```sql
CREATE TABLE CVE_Info (
    id INT AUTO_INCREMENT PRIMARY KEY,
    collect_time TEXT,
    CVE_Code TEXT UNIQUE,
    state TEXT,
    dateReserved TEXT,
    datePublished TEXT,
    dateUpdated TEXT,
    product TEXT,
    descriptions LONGTEXT,
    effect_version TEXT,
    cweId TEXT,
    Attak_Type TEXT,
    CVSS_Score FLOAT,
    CVSS_Vertor TEXT,
    CVSS_Serverity TEXT,
    CVSS_vertorString TEXT,
    solutions LONGTEXT,
    Response_data LONGTEXT,
    INDEX idx_CVE_Code (CVE_Code(50)),
    INDEX idx_CVSS_Serverity (CVSS_Serverity(20))
);
```

**필드 설명**:

| 필드명 | 타입 | 설명 | 예시 값 |
|-------|------|------|---------|
| `id` | INT | 고유 ID | `1` |
| `collect_time` | TEXT | 수집 시간 | `2025-10-12 11:00:00` |
| `CVE_Code` | TEXT | CVE 코드 (고유) | `CVE-2025-1234` |
| `state` | TEXT | 상태 | `PUBLISHED`, `REJECTED` |
| `dateReserved` | TEXT | 예약일 | `2025-01-01` |
| `datePublished` | TEXT | 공개일 | `2025-01-15` |
| `dateUpdated` | TEXT | 업데이트일 | `2025-01-20` |
| `product` | TEXT | 영향받는 제품 | `Apache Struts 2.5.x` |
| `descriptions` | LONGTEXT | 취약점 설명 (번역) | `이 취약점은...` |
| `effect_version` | TEXT | 영향받는 버전 | `2.5.0 - 2.5.28` |
| `cweId` | TEXT | CWE 분류 | `CWE-20`, `CWE-79` |
| `Attak_Type` | TEXT | 공격 유형 | `Remote Code Execution` |
| `CVSS_Score` | FLOAT | CVSS 점수 | `9.8` |
| `CVSS_Vertor` | TEXT | CVSS 벡터 | `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H` |
| `CVSS_Serverity` | TEXT | 위험도 | `CRITICAL`, `HIGH`, `MEDIUM`, `LOW` |
| `CVSS_vertorString` | TEXT | CVSS 벡터 문자열 | (CVSS_Vertor와 동일) |
| `solutions` | LONGTEXT | 해결 방안 (번역) | `최신 버전으로 업데이트...` |
| `Response_data` | LONGTEXT | 원본 JSON 응답 | `{"cve": {...}}` |

**주요 쿼리**:
```sql
-- 특정 CVE 조회
SELECT * FROM CVE_Info WHERE CVE_Code = 'CVE-2025-1234';

-- 위험도별 통계
SELECT CVSS_Serverity, COUNT(*) as count 
FROM CVE_Info 
GROUP BY CVSS_Serverity;

-- 최근 공개된 CVE
SELECT * FROM CVE_Info 
ORDER BY datePublished DESC 
LIMIT 20;
```

---

### 3. CVE_Packet_AI_Analysis

AI(Gemini Pro)가 분석한 POC 분석 결과를 저장합니다.

**테이블 생성 SQL**:
```sql
CREATE TABLE CVE_Packet_AI_Analysis (
    id INT AUTO_INCREMENT PRIMARY KEY,
    link TEXT,
    download_path TEXT,
    cve_summary LONGTEXT,
    step INT,
    packet_text LONGTEXT,
    vuln_stage TEXT,
    stage_description LONGTEXT,
    expected_response LONGTEXT,
    mitre_tactic TEXT,
    mitre_technique TEXT,
    snort_rule LONGTEXT,
    remediation LONGTEXT,
    INDEX idx_link (link(255)),
    INDEX idx_step (step)
);
```

**필드 설명**:

| 필드명 | 타입 | 설명 | 예시 값 |
|-------|------|------|---------|
| `id` | INT | 고유 ID | `1` |
| `link` | TEXT | GitHub 링크 (외래키) | `https://github.com/user/repo` |
| `download_path` | TEXT | 다운로드 경로 | `CVE/CVE-2025-1234/1` |
| `cve_summary` | LONGTEXT | 취약점 요약 | `이 취약점은 Apache Struts...` |
| `step` | INT | 공격 단계 번호 | `1`, `2`, `3` |
| `packet_text` | LONGTEXT | 공격 패킷 샘플 | `POST /struts2-showcase...` |
| `vuln_stage` | TEXT | 공격 단계명 | `Reconnaissance`, `Exploitation` |
| `stage_description` | LONGTEXT | 단계 설명 | `이 단계에서 공격자는...` |
| `expected_response` | LONGTEXT | 예상 응답 | `서버는 HTTP 200 OK를 반환...` |
| `mitre_tactic` | TEXT | MITRE Tactic | `Initial Access` |
| `mitre_technique` | TEXT | MITRE Technique | `T1190` |
| `snort_rule` | LONGTEXT | Snort 탐지 룰 | `alert tcp any any -> ...` |
| `remediation` | LONGTEXT | 대응 방안 | `즉시 최신 버전으로 업데이트...` |

**주요 쿼리**:
```sql
-- 특정 POC의 분석 결과
SELECT * FROM CVE_Packet_AI_Analysis 
WHERE link = 'https://github.com/user/repo' 
ORDER BY step;

-- MITRE 기법별 통계
SELECT mitre_technique, COUNT(*) as count 
FROM CVE_Packet_AI_Analysis 
WHERE mitre_technique IS NOT NULL 
GROUP BY mitre_technique 
ORDER BY count DESC;
```

---

### 4. CVE_Integrated_Data

3개 테이블(Github_CVE_Info, CVE_Info, CVE_Packet_AI_Analysis)을 조인하여 통합한 데이터입니다.

**테이블 생성 SQL**:
```sql
CREATE TABLE CVE_Integrated_Data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hash_key VARCHAR(64) UNIQUE,
    github_cve TEXT,
    github_link TEXT,
    github_title TEXT,
    github_writer TEXT,
    github_date TEXT,
    github_collect_time TEXT,
    github_readme LONGTEXT,
    github_trans_msg LONGTEXT,
    github_download_path TEXT,
    github_status TEXT,
    cve_collect_time TEXT,
    cve_code TEXT,
    cve_state TEXT,
    cve_date_reserved TEXT,
    cve_date_published TEXT,
    cve_date_updated TEXT,
    cve_product TEXT,
    cve_descriptions LONGTEXT,
    cve_effect_version TEXT,
    cve_cwe_id TEXT,
    cve_attack_type TEXT,
    cve_cvss_score FLOAT,
    cve_cvss_vector TEXT,
    cve_cvss_severity TEXT,
    cve_cvss_vector_string TEXT,
    cve_solutions LONGTEXT,
    ai_step INT,
    ai_packet_text LONGTEXT,
    ai_vuln_stage TEXT,
    ai_stage_description LONGTEXT,
    ai_expected_response LONGTEXT,
    ai_mitre_tactic TEXT,
    ai_mitre_technique TEXT,
    ai_snort_rule LONGTEXT,
    ai_cve_summary LONGTEXT,
    ai_remediation LONGTEXT,
    INDEX idx_hash_key (hash_key),
    INDEX idx_github_cve (github_cve(50)),
    INDEX idx_cve_code (cve_code(50))
);
```

**Hash Key 생성 방식**:
```python
hash_string = f"{github_cve}{github_link}{github_date}{ai_step}"
hash_key = hashlib.sha256(hash_string.encode()).hexdigest()
```

**특징**:
- 각 공격 단계마다 별도의 행으로 저장
- 중복 방지: hash_key로 고유성 보장
- 빠른 조회: 모든 정보가 한 테이블에 통합

---

### 5. users

웹사이트 사용자 정보를 저장합니다.

**테이블 생성 SQL**:
```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100) NOT NULL,
    nickname VARCHAR(50),
    role ENUM('user', 'analyst', 'admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email)
);
```

**필드 설명**:

| 필드명 | 타입 | 설명 | 예시 값 |
|-------|------|------|---------|
| `id` | INT | 사용자 ID | `1` |
| `username` | VARCHAR(50) | 아이디 (고유) | `admin` |
| `password` | VARCHAR(255) | 암호화된 비밀번호 (bcrypt) | `$2b$10$...` |
| `name` | VARCHAR(100) | 이름 | `홍길동` |
| `phone` | VARCHAR(20) | 전화번호 | `010-1234-5678` |
| `email` | VARCHAR(100) | 이메일 | `user@example.com` |
| `nickname` | VARCHAR(50) | 닉네임 | `보안전문가` |
| `role` | ENUM | 권한 | `user`, `analyst`, `admin` |
| `created_at` | TIMESTAMP | 가입일 | `2025-10-12 10:00:00` |

**기본 관리자 계정**:
```sql
INSERT INTO users (username, password, name, email, role) 
VALUES ('admin', '$2b$10$...', 'Administrator', 'admin@example.com', 'admin');
```

**권한별 기능**:
- `user`: CVE 조회, 게시판, 채팅
- `analyst`: user 기능 + DB 직접 쿼리
- `admin`: analyst 기능 + 사용자 관리, 로그 확인, API 토큰 관리

---

### 6. board_posts

자유게시판 게시글을 저장합니다.

**테이블 생성 SQL**:
```sql
CREATE TABLE board_posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    file_path VARCHAR(255),
    views INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
);
```

**보안 기능**:
- XSS 방지: DOMPurify로 content 정제
- 파일 검증: 악성 파일 차단
- SQL Injection 방지: 파라미터화 쿼리

---

### 7. chat_messages

실시간 채팅 메시지를 저장합니다.

**테이블 생성 SQL**:
```sql
CREATE TABLE chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    username VARCHAR(50) NOT NULL,
    nickname VARCHAR(50),
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_created_at (created_at)
);
```

**자동 정리**:
- 3일 이상 된 메시지 자동 삭제
- 서버 시작 시 실행

---

### 8. api_tokens

외부 시스템 연동용 API 토큰을 저장합니다.

**테이블 생성 SQL**:
```sql
CREATE TABLE api_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    token VARCHAR(64) UNIQUE NOT NULL,
    permissions JSON,
    expires_at DATETIME,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_token (token),
    INDEX idx_is_active (is_active)
);
```

**permissions JSON 구조**:
```json
{
    "read": true,
    "write": false
}
```

---

## 🔗 ERD (개체 관계도)

```
┌─────────────────────┐
│   Github_CVE_Info   │
│─────────────────────│
│ id (PK)             │
│ cve                 │───┐
│ link                │   │
│ title               │   │
│ AI_chk              │   │
│ status              │   │
└─────────────────────┘   │
                          │
                          │ (1:1)
                          ↓
┌─────────────────────┐
│     CVE_Info        │
│─────────────────────│
│ id (PK)             │
│ CVE_Code (UNIQUE)   │←──┘
│ CVSS_Score          │
│ CVSS_Serverity      │
└─────────────────────┘

┌─────────────────────┐
│ CVE_Packet_AI_Analysis │
│─────────────────────│
│ id (PK)             │
│ link                │───┐
│ step                │   │
│ mitre_technique     │   │ (N:1)
└─────────────────────┘   │
                          ↓
            ┌─────────────────────┐
            │   Github_CVE_Info   │
            │─────────────────────│
            │ link                │
            └─────────────────────┘

┌─────────────────────┐
│       users         │
│─────────────────────│
│ id (PK)             │
│ username (UNIQUE)   │
│ role                │
└─────────────────────┘
         │
         │ (1:N)
         ↓
┌─────────────────────┐
│   board_posts       │
│─────────────────────│
│ id (PK)             │
│ user_id (FK)        │
└─────────────────────┘

         │
         │ (1:N)
         ↓
┌─────────────────────┐
│  chat_messages      │
│─────────────────────│
│ id (PK)             │
│ user_id (FK)        │
└─────────────────────┘

         │
         │ (1:N)
         ↓
┌─────────────────────┐
│   api_tokens        │
│─────────────────────│
│ id (PK)             │
│ created_by (FK)     │
└─────────────────────┘
```

---

## ⚡ 인덱스 및 최적화

### 주요 인덱스

| 테이블 | 인덱스 | 컬럼 | 용도 |
|-------|-------|------|------|
| Github_CVE_Info | idx_cve | cve | CVE 검색 |
| Github_CVE_Info | idx_AI_chk | AI_chk | AI 분석 대상 필터 |
| Github_CVE_Info | idx_status | status | 외부 전송 대상 필터 |
| CVE_Info | idx_CVE_Code | CVE_Code | CVE 검색 |
| CVE_Info | idx_CVSS_Serverity | CVSS_Serverity | 위험도 필터 |
| CVE_Packet_AI_Analysis | idx_link | link | POC 연결 |
| users | idx_username | username | 로그인 |
| board_posts | idx_created_at | created_at | 최신순 정렬 |

### 쿼리 최적화 팁

1. **LIMIT 사용**: 대량 데이터 조회 시 페이지네이션
2. **INDEX 활용**: WHERE 절에 인덱스 컬럼 사용
3. **JOIN 최소화**: 필요한 경우만 JOIN 사용
4. **TEXT 컬럼**: LONGTEXT는 SELECT 시 부하가 크므로 필요한 경우만 조회

---

**문서 작성**: 2025년 10월 12일  
**최종 수정**: 2025년 10월 12일

