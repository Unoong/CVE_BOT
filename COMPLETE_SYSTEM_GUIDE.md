# 🛡️ CVE 취약점 관리 플랫폼 - 완전 가이드

## 📋 목차
1. [시스템 개요](#시스템-개요)
2. [CVE 데이터 출처](#cve-데이터-출처)
3. [주요 기능](#주요-기능)
4. [시스템 구성](#시스템-구성)
5. [웹 인터페이스 사용법](#웹-인터페이스-사용법)
6. [관리자 기능](#관리자-기능)
7. [성능 최적화](#성능-최적화)
8. [문제 해결](#문제-해결)

---

## 🎯 시스템 개요

이 시스템은 **CVE(Common Vulnerabilities and Exposures) 취약점 정보**를 자동으로 수집하고, **GitHub POC(Proof of Concept)**를 다운로드하며, **AI 모델을 활용한 심층 분석**을 제공하는 통합 보안 플랫폼입니다.

### 핵심 가치
- ✅ **자동화**: CVE 수집부터 AI 분석까지 완전 자동화
- ✅ **정확성**: MITRE CVE 공식 데이터 기반
- ✅ **실용성**: 실제 공격 코드(POC) 분석 및 탐지 룰 자동 생성
- ✅ **속도**: 병렬 처리로 3분당 5건 분석 (기존 대비 5배 향상)
- ✅ **확장성**: 17만+ CVE 데이터를 0.5초 이내 조회

---

## 🏆 CVE 데이터 출처

### MITRE CVE List - 사이버 보안의 표준

**CVE(Common Vulnerabilities and Exposures)** 프로그램은 미국의 비영리 연구 개발 센터인 **MITRE Corporation**이 주관하며, 미국 국토안보부(DHS) 산하 **사이버 보안 및 인프라 보안국(CISA)**의 후원을 받습니다.

#### 1️⃣ **표준의 원천 (The Root Standard)**
- **CVE ID 할당**: 전 세계 모든 공개 소프트웨어 취약점에 대해 고유 식별자 부여
- **공식 주체**: MITRE는 CVE ID를 할당하고 목록을 관리하는 **Primary Authority**
- **산업 표준**: 다른 모든 보안 데이터베이스(NIST NVD, Exploit-DB 등)가 이 CVE ID를 기반으로 구축

#### 2️⃣ **광범위한 협력 체계 (CNA)**
MITRE는 전 세계 보안 연구 기관, 소프트웨어 벤더, 클라우드 서비스 제공자들과 협력합니다:
- **주요 파트너**: Microsoft, Apple, Google, Amazon, Red Hat, Oracle 등
- **CVE Numbering Authority (CNA)**: 300개 이상의 조직이 직접 CVE ID 발급 권한 보유
- **신뢰성 확보**: 광범위한 검증 프로세스를 통한 데이터 품질 보증

#### 3️⃣ **제공 정보의 특징**
**MITRE CVE List:**
- ✅ 취약점 고유 식별자 (CVE-YYYY-XXXXX)
- ✅ 간결한 취약점 설명 (Summary)
- ✅ 영향받는 제품 및 버전
- ✅ 참조 링크 (Advisory, Patch 정보 등)

**NIST NVD (National Vulnerability Database):**
- MITRE CVE 데이터를 기반으로 **상세 분석 정보 추가**
- CVSS 점수, CWE 분류, 공격 벡터 분석
- 패치 정보 및 대응 방안

#### 4️⃣ **본 시스템의 데이터 활용**
```
MITRE CVE List (공식 출처)
    ↓
본 시스템 CVE_Info 테이블 (170,000+ CVE, 2020년 이후)
    ↓
GitHub POC 수집 (2,574개 CVE, 4,613개 POC)
    ↓
AI 보안 전문가 분석 (215+ POC 완료)
    ↓
MITRE ATT&CK 매핑 + Snort IDS 룰 생성
```

---

## 🌟 주요 기능

### 1️⃣ **자동 CVE 수집**
- **출처**: MITRE CVE List (공식 API)
- **범위**: 2020년~현재 (170,095개 CVE)
- **주기**: 실시간 업데이트 (설정 가능)
- **저장**: CVE 코드, 상태, CVSS 점수, 영향받는 제품, 설명 등

### 2️⃣ **GitHub POC 수집**
- **검색**: GitHub API를 통한 자동 검색
- **필터링**: Python, JavaScript 등 주요 언어
- **다운로드**: ZIP 파일 자동 다운로드 및 압축 해제
- **저장**: POC 링크, 제목, 작성자, 수집 시간
- **중복 방지**: CVE당 최대 5개 POC

### 3️⃣ **AI 보안 전문가 분석** ⭐
#### 분석 엔진:
- **Gemini 2.5 Pro**: Google의 최신 AI 모델
- **병렬 처리**: 최대 5개 POC 동시 분석
- **처리 속도**: 3분당 5건 (기존 10분당 1건 대비 5배 향상)
- **계정 로테이션**: 5개 계정 자동 순환 (일일 할당량 관리)

#### 분석 내용:
1. **취약점 요약**: CVE 상세 분석 및 한글 요약
2. **영향받는 제품**: Vendor, Product, 취약 버전, 패치 버전 자동 추출
3. **공격 단계 분석**: 
   - POC 코드를 단계별로 분해
   - 각 단계의 목적 및 위험도 분석
   - 원시 네트워크 패킷 추출
4. **MITRE ATT&CK 매핑**: 
   - 공격 전술(Tactic) 자동 분류
   - 공격 기법(Technique) ID 매핑
5. **Snort IDS 탐지 룰**: 
   - 네트워크 패킷 기반 자동 생성
   - 즉시 적용 가능한 형식
6. **대응 방안**: 
   - 취약점 패치 권고사항
   - 임시 대응 방법(Workaround)
7. **예상 서버 응답**: 공격 성공 시 예상되는 응답

### 4️⃣ **대시보드 & 통계**
- **실시간 모니터링**: CVE 수집 현황, AI 분석 진행률
- **통계 분석**: 
  - 공격 단계별 분포 (2025년 기준)
  - CWE 유형별 분포
  - 공격 유형별 분포
  - CVSS 위험도 분포
  - 영향받는 제품 Top 10
- **집계 시스템**: 일별 집계 테이블로 **0.2초 이내 로딩**

### 5️⃣ **고급 검색 & 필터**
- **POC 존재 여부**: POC 있음/없음
- **AI 분석 여부**: 분석 완료/미완료
- **공격 유형**: 다중 선택 가능
- **CVSS 위험도**: CRITICAL, HIGH, MEDIUM, LOW
- **상태**: PUBLISHED, REJECTED
- **정렬**: 최신 등록순, 예약일, CVSS 점수 등

### 6️⃣ **사용자 관리**
- **역할 기반 접근 제어**: user, analyst, admin
- **회원가입**: 이메일 인증 (6자리 코드)
- **비밀번호 찾기**: 아이디/이메일 기반 인증
- **프로필 관리**: 닉네임, 전화번호, 정보 수정
- **최근 로그인 추적**: 관리자 패널에서 확인 가능

### 7️⃣ **실시간 채팅**
- **Socket.IO 기반**: 실시간 메시지 전송
- **이미지 첨부**: 클립보드 붙여넣기, 드래그&드롭
- **사용자 알림**: 새 메시지 알림 배지

### 8️⃣ **관리자 전용 기능**
- **사용자 관리**: 권한 변경, 비밀번호 초기화, 계정 삭제
- **AI 할당량 관리**: 
  - 계정별 사용 현황 실시간 모니터링
  - 일별/이벤트별 상세 로그
  - 할당량 초과 알림
- **데이터베이스 조회**: SQL 쿼리 실행 (읽기 전용)
- **데이터 내보내기**: CSV 형식 다운로드

---

## 🔧 시스템 구성

### 백엔드
- **Node.js + Express**: 웹 서버 (포트 32577/HTTP, 32578/HTTPS)
- **MySQL**: 데이터베이스 (포트 7002)
- **Socket.IO**: 실시간 통신
- **JWT**: 인증 토큰

### 프론트엔드
- **React 18**: UI 프레임워크
- **Vite**: 개발 서버 (포트 3000)
- **Material-UI v6**: 디자인 시스템
- **Axios**: HTTP 클라이언트

### AI 분석 모듈
- **Python 3.x**: 분석 엔진
- **Gemini CLI**: Google AI 모델 인터페이스
- **병렬 처리**: ThreadPoolExecutor (5 workers)
- **계정 로테이션**: 5개 Gemini 계정 자동 순환

### 데이터베이스 스키마
```
CVE_Info (170,095개)
├─ CVE_Code (PK)
├─ state, product, CVSS_Score
├─ dateReserved, datePublished
└─ descriptions, cweId, Attak_Type

Github_CVE_Info (4,613개)
├─ id (PK)
├─ cve → CVE_Info.CVE_Code (FK)
├─ link, title, writer
├─ AI_chk ('Y'/'N')
└─ collect_time

CVE_Packet_AI_Analysis (215+ POC, 1,000+ 단계)
├─ id (PK)
├─ link → Github_CVE_Info.link (FK)
├─ cve_summary, affected_products (JSON)
├─ step, packet_text, vuln_stage
├─ mitre_tactic, mitre_technique
├─ snort_rule, remediation
└─ expected_response

gemini_accounts (5개)
├─ account_name, account_email
├─ display_order, is_active
└─ 로테이션 관리

gemini_quota_usage (일별 사용량)
├─ account_id, usage_date
├─ request_count, success/failed_count
├─ is_quota_exceeded
└─ last_used_at

gemini_quota_events (이벤트 로그)
├─ account_id, event_type
├─ cve_code, poc_link
└─ error_message, created_at

dashboard_stats_daily (일별 집계)
├─ stat_date, total_cves, total_pocs
├─ analyzed_pocs, pending_pocs
└─ cves_2025, pocs_today

dashboard_*_stats (6개 집계 테이블)
├─ 공격 단계별, CWE, 공격 유형
├─ CVSS 분포, 영향받는 제품
└─ 2025년 기준, Top 10 순위
```

---

## 🌐 웹 인터페이스 사용법

### 1️⃣ **접속 방법**

#### 로컬 접속:
```
HTTP:  http://localhost:3000
HTTPS: https://localhost:3000
```

#### 외부 접속:
```
HTTP:  http://www.ai-platform.store:3000
HTTPS: https://www.ai-platform.store:3000
```

### 2️⃣ **대시보드**

#### 주요 통계 카드:
- **전체 CVE**: 수집된 총 CVE 개수 (2020년 이후)
- **수집된 POC**: GitHub에서 수집한 POC 개수
- **AI 분석 완료**: AI 분석이 완료된 POC 개수
- **분석 대기**: AI 분석 대기 중인 POC 개수

#### 통계 차트:
- **공격 단계별 분석** (2025년 기준, Top 10)
  - Reconnaissance, Initial Access, Execution 등
  - 클릭 시 해당 단계의 CVE 목록 표시
  
- **CWE 유형별 분석** (2025년 기준, Top 10)
  - CWE-79, CWE-89 등 취약점 유형
  - 클릭 시 해당 CWE의 CVE 목록 표시
  
- **공격 유형별 분석** (2025년 기준, Top 10)
  - SQL Injection, XSS, RCE 등
  - 클릭 시 해당 유형의 CVE 목록 표시
  
- **영향받는 제품** (2025년 기준, Top 10)
  - 제품별 CVE 개수
  - 클릭 시 해당 제품의 CVE 목록 표시

#### AI 분석 진행률:
- **분석 속도**: 3분당 5건 (병렬 처리)
- **예상 완료 시간**: 실시간 계산
- **AI 모델 기능**: POC 분석, 패킷 추출, MITRE 매핑, Snort 룰 생성 등

#### Gemini API 할당량 현황 (관리자 전용):
- 오늘의 요청 수 / 성공 / 실패
- 활성 계정 수 / 초과 계정 수
- 클릭 시 상세 페이지 이동

#### 통계 갱신:
- **자동 갱신**: 매일 오전 3시 (작업 스케줄러)
- **수동 갱신**: `node init_dashboard_stats.js`
- **갱신 시간**: 우측 상단 칩에 표시

### 3️⃣ **CVE 정보**

#### 검색 기능:
- **키워드 검색**: CVE 코드 또는 제품명
- **Enter 키**: 즉시 검색

#### 필터 (2줄 레이아웃):
**첫 번째 줄:**
- **검색창**: CVE 코드 또는 제품명
- **위험도**: CRITICAL, HIGH, MEDIUM, LOW
- **POC 존재** ✅: POC 있음 (기본값) / POC 없음 / 전체
- **검색 버튼**: 필터 적용

**두 번째 줄:**
- **상태**: PUBLISHED, REJECTED, 전체
- **AI 분석** ✅: AI 분석 완료 (기본값) / 미완료 / 전체
- **공격 유형**: 다중 선택 (체크박스)
- **정렬 기준**: 최신 등록순 ⭐ (기본값) / 예약일 / 공개일 / CVSS 점수 등
- **순서**: 최신순 / 오래된순
- **표시 개수**: 10 / 20 / 50 / 100개
- **필터 초기화**: 모든 필터를 기본값으로 리셋

#### 기본 필터 (페이지 열 때):
```
✅ POC 있음
✅ AI 분석 완료
⭐ 최신 등록순 (DESC)
→ 실전에 바로 활용 가능한 CVE만 표시!
```

#### CVE 카드 정보:
- **CVE 코드**: 클릭 시 상세 페이지 이동
- **영향받는 제품**: 제품명 표시
- **예약일**: CVE 등록 날짜
- **CVSS 위험도**: 색상 구분 (CRITICAL=빨강, HIGH=주황 등)
- **CVSS 점수**: 숫자 점수
- **POC 개수**: 🟢 POC X개 (있을 때만 표시)
- **AI 분석 상태**: 🔵 AI 분석 완료 (완료 시만 표시)
- **상태**: PUBLISHED / REJECTED

#### 페이지네이션:
- 하단 페이지 번호 클릭으로 이동
- 총 페이지 수 자동 계산

### 4️⃣ **CVE 상세 페이지**

#### 기본 정보:
- CVE 코드, 상태
- 영향받는 제품
- CVSS 점수 및 위험도
- 취약점 설명 (한국어)
- CWE 유형
- 예약일, 공개일, 업데이트일

#### POC 목록:
- 관련 GitHub POC 링크
- POC 제목, 작성자
- AI 분석 여부 (✅/❌)
- 클릭 시 POC 상세 페이지 이동

### 5️⃣ **POC 상세 페이지**

#### POC 기본 정보:
- POC 제목, 작성자
- GitHub 링크
- 수집 시간

#### AI 분석 결과 (AI_chk = 'Y'일 때):

**1. 취약점 요약**
- CVE에 대한 상세 설명 (한글)
- 공격 원리 및 영향

**2. 영향받는 제품 및 버전**
- Vendor, Product
- 취약 버전 범위
- 패치 버전 (있을 경우)

**3. 공격 단계별 분석** (Accordion)
각 단계마다:
- **단계 번호 & 공격 단계**: Reconnaissance, Exploitation 등
- **단계 설명**: 해당 단계의 목적
- **원시 네트워크 패킷**: 실제 전송되는 패킷
- **MITRE ATT&CK**: 전술(Tactic) 및 기법(Technique) ID
  - 클릭 시 MITRE 상세 정보 다이얼로그
- **Snort IDS 탐지 룰**: 즉시 적용 가능
- **대응 방안**: 패치 및 임시 대응 방법
- **예상 서버 응답**: 공격 성공 시 응답

**4. 관련 POC**
- 동일 CVE의 다른 POC 목록

### 6️⃣ **AI 할당량 관리** (관리자 전용)

#### 오늘의 할당량 현황:
- 계정별 사용량 / 할당량
- 성공 / 실패 건수
- 할당량 초과 여부
- 마지막 사용 시간
- 진행률 바 (시각화)

#### 최근 7일 사용 이력:
- 일별 요청 수, 성공/실패 건수
- 할당량 초과 날짜
- 테이블 형식으로 표시

#### 상세 이벤트 로그 (최근 50건):
- 성공 / 실패 / 할당량 초과 / 계정 전환
- CVE 코드, POC 링크
- 에러 메시지
- 타임스탬프

#### 병렬 분석 안내:
- ⚡ 최대 5개 POC 동시 분석
- 3분당 5건 처리 (기존 대비 5배 빠름)

### 7️⃣ **자유게시판**

#### 게시글 작성:
- 제목, 내용
- 파일 첨부 (최대 10MB)
- 작성자 자동 기록

#### 게시글 목록:
- 제목, 작성자, 조회수, 댓글 수
- 작성일
- 페이지네이션

#### 게시글 상세:
- 내용 표시
- 첨부파일 다운로드
- 댓글 작성/수정/삭제
- 게시글 수정/삭제 (본인만)

---

## 👨‍💼 관리자 기능

### 사용자 관리
- **사용자 목록**: ID, 이름, 닉네임, 이메일, 전화번호, 권한, 가입일, 최근 로그인
- **권한 변경**: user ↔ analyst ↔ admin
- **비밀번호 초기화**: 임시 비밀번호 설정
- **계정 삭제**: 사용자 삭제 (복구 불가)

### AI 할당량 관리
- **실시간 모니터링**: 30초마다 자동 갱신
- **계정별 상세 현황**: 
  - 사용량 / 할당량
  - 성공률
  - 마지막 사용 시간
- **이벤트 로그**: 모든 요청 기록
- **자동 계정 전환**: 할당량 초과 시 자동 전환

---

## ⚡ 성능 최적화

### 1️⃣ **데이터베이스 최적화**

#### 인덱스 (CVE_Info 테이블):
```sql
-- 12개 인덱스 추가 (검색 속도 100배 향상)
idx_cve_code         -- CVE 코드 검색
idx_date_reserved    -- 예약일 정렬
idx_cvss_severity    -- 위험도 필터
idx_state            -- 상태 필터
idx_cwe_id           -- CWE 유형 필터
idx_attack_type      -- 공격 유형 필터
idx_product          -- 제품명 필터
... 5개 추가
```

#### 집계 테이블:
```sql
-- 일별 집계로 실시간 계산 제거
dashboard_stats_daily          -- 기본 통계
dashboard_cvss_distribution    -- CVSS 분포
dashboard_product_stats        -- 제품별 Top 10
dashboard_cwe_stats            -- CWE Top 10
dashboard_attack_type_stats    -- 공격 유형 Top 10
dashboard_attack_stage_stats   -- 공격 단계 Top 10
```

#### 연결 풀:
```javascript
connectionLimit: 50,  // 동시 50개 연결
waitForConnections: true,
queueLimit: 0
```

### 2️⃣ **쿼리 최적화**

#### Before (느림):
```sql
-- 170초 소요 ❌
SELECT * FROM CVE_Info
ORDER BY dateReserved DESC  -- TEXT 타입 정렬
LIMIT 20
```

#### After (빠름):
```sql
-- 0.036초 소요 ✅
SELECT * FROM CVE_Info
ORDER BY id DESC  -- INT 타입 정렬, PRIMARY KEY
LIMIT 20
```

#### 집계 조회:
```sql
-- Before: 실시간 COUNT (30초)
SELECT COUNT(*) FROM CVE_Info WHERE CVE_Code LIKE 'CVE-2025-%'

-- After: 집계 테이블 (0.01초)
SELECT cves_2025 FROM dashboard_stats_daily ORDER BY stat_date DESC LIMIT 1
```

### 3️⃣ **AI 분석 최적화**

#### 병렬 처리:
```python
MAX_WORKERS = 5  # 최대 5개 동시 실행
ThreadPoolExecutor(max_workers=MAX_WORKERS)

# 성능:
# 순차 처리: 10분 × 5건 = 50분
# 병렬 처리: 3분 (5개 동시) = 3분 ⚡
```

#### 계정 로테이션:
```
계정 1: 1,500 / 1,500 (초과) ❌
  ↓ 자동 전환
계정 2: 0 / 1,500 (사용 가능) ✅
  ↓ 계속 분석
계정 3, 4, 5... (대기)
```

### 4️⃣ **프론트엔드 최적화**

#### 2단계 로딩:
```javascript
// 1단계: 기본 통계 (0.2초)
/api/dashboard/stats → 즉시 표시

// 2단계: 상세 통계 (0.5초 후)
/api/dashboard/detailed-stats → 스켈레톤 → 데이터 표시
```

#### 타임아웃 증가:
```javascript
axios.get(url, { timeout: 30000 })  // 30초
```

---

## 🔧 시스템 운영

### 1️⃣ **서버 시작**

#### 방법 1: 배치 파일 (권장)
```batch
E:\LLama\pythonProject\CVE_BOT\web\start_server_no_freeze.bat
```
- QuickEdit Mode 자동 비활성화
- CMD 클릭해도 멈추지 않음

#### 방법 2: 수동 실행
```bash
cd E:\LLama\pythonProject\CVE_BOT\web
node server.js
```

#### 서버 재시작:
```batch
E:\LLama\pythonProject\CVE_BOT\web\restart.bat
```

### 2️⃣ **CVE 수집 실행**
```bash
cd E:\LLama\pythonProject\CVE_BOT
python main.py
```

### 3️⃣ **AI 분석 실행**
```bash
cd E:\LLama\pythonProject\CVE_BOT
python run_ai_analysis.py
```

### 4️⃣ **대시보드 통계 갱신**

#### 수동 갱신:
```bash
cd E:\LLama\pythonProject\CVE_BOT\web
node init_dashboard_stats.js
```
- 소요 시간: 약 10~30초
- 갱신 내용: 전체 CVE/POC 개수, 2025년 통계, Top 10 순위

#### 자동 갱신 (작업 스케줄러):
```powershell
# 관리자 PowerShell
cd E:\LLama\pythonProject\CVE_BOT\web
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
.\register_task_scheduler.ps1
```
- 실행 시간: 매일 오전 3시
- 작업 이름: `CVE_Dashboard_Stats_Update`
- 확인: `taskschd.msc` → 작업 스케줄러 라이브러리

---

## 🔍 데이터 확인

### MySQL 직접 접속:
```bash
mysql -h localhost -P 7002 -u root -p
# 비밀번호: !db8354

USE TOTORO;

# 전체 CVE 개수
SELECT COUNT(*) FROM CVE_Info;

# POC가 있는 CVE
SELECT COUNT(DISTINCT cve) FROM Github_CVE_Info;

# AI 분석 완료
SELECT COUNT(DISTINCT link) FROM CVE_Packet_AI_Analysis;

# 2025년 CVE
SELECT COUNT(*) FROM CVE_Info WHERE CVE_Code LIKE 'CVE-2025-%';
```

---

## 🚨 문제 해결

### 대시보드가 로딩 안 됨
**원인**: 집계 테이블 데이터 없음  
**해결**:
```bash
cd E:\LLama\pythonProject\CVE_BOT\web
node init_dashboard_stats.js
```

### CVE 목록이 느림
**원인**: 인덱스 부족  
**해결**:
```bash
node optimize_cve_info_indexes.js
```

### AI 분석이 멈춤
**원인**: 할당량 초과, 계정 전환 실패  
**확인**: 관리자 → AI 할당량 페이지  
**해결**: 
- 할당량 리셋 대기 (익일 자동)
- 또는 새 Gemini 계정 추가

### CMD가 멈춤 (QuickEdit Mode)
**해결**:
```batch
start_server_no_freeze.bat
```

### 2020년 이전 CVE 삭제
```bash
cd E:\LLama\pythonProject\CVE_BOT\web
node delete_cves_before_2020.js
```

---

## 📌 주요 파일 경로

```
E:\LLama\pythonProject\CVE_BOT\
├── main.py                      # CVE 수집 메인
├── run_ai_analysis.py           # AI 분석 메인
├── config.json                  # 설정 파일
├── CVE/                         # POC ZIP 저장
├── logs/                        # 로그 파일
├── web/
│   ├── server.js                # 백엔드 서버
│   ├── restart.bat              # 서버 재시작
│   ├── start_server_no_freeze.bat  # 서버 시작 (QuickEdit 비활성화)
│   ├── init_dashboard_stats.js  # 통계 갱신
│   ├── update_dashboard_stats.bat  # 통계 갱신 배치
│   ├── register_task_scheduler.ps1 # 자동 갱신 등록
│   └── client/
│       └── src/
│           ├── pages/           # 페이지 컴포넌트
│           │   ├── Dashboard.jsx
│           │   ├── CVEList.jsx
│           │   ├── POCDetail.jsx
│           │   ├── GeminiQuota.jsx
│           │   └── ...
│           └── components/       # 재사용 컴포넌트
└── gemini_account/              # Gemini 계정 디렉토리
    ├── .gemini_gpt8354/
    ├── .gemini_imjong1111/
    ├── .gemini_lim902931/
    ├── .gemini_now/
    └── .gemini_shinhands_gpt/
```

---

## 💡 팁 & 권장사항

### 성능:
- ✅ **2020년 이후 CVE만 유지** (170,095개)
- ✅ **인덱스 최적화 적용**
- ✅ **집계 테이블 매일 갱신**
- ✅ **연결 풀 50개 유지**

### 보안:
- ✅ **HTTPS 사용** (포트 32578)
- ✅ **JWT 인증** 필수
- ✅ **역할 기반 권한** 관리
- ✅ **SQL Injection 방어** (Prepared Statement)

### 운영:
- ✅ **작업 스케줄러** 등록 (통계 자동 갱신)
- ✅ **QuickEdit Mode** 비활성화 (CMD 멈춤 방지)
- ✅ **로그 레벨** 조정 (`logger.config.json`)
- ✅ **AI 계정 로테이션** 활성화

---

## 📞 지원

### 로그 확인:
```
E:\LLama\pythonProject\CVE_BOT\logs\
├── cve_collector_YYYYMMDD.log   # CVE 수집 로그
├── ai_analysis_YYYYMMDD.log     # AI 분석 로그
└── dashboard_update.log         # 통계 갱신 로그
```

### 서버 로그:
```bash
# 서버 콘솔 직접 확인
# 또는 logger.config.json에서 파일 로깅 설정
```

---

**최종 업데이트: 2025-10-20**  
**시스템 버전: v2.5** (병렬 분석 + 성능 최적화)

