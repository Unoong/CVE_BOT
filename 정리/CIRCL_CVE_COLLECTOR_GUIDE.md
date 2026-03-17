# 🌐 CIRCL CVE 수집기 사용 가이드

## 📖 개요

**CIRCL Vulnerability-Lookup API**를 통해 최신 보안 권고문(CSAF 형식)에서 CVE 정보를 자동으로 수집하고 DB에 저장하는 모듈입니다.

### 📡 데이터 출처
- **출처**: CIRCL (Computer Incident Response Center Luxembourg)
- **API URL**: https://vulnerability.circl.lu/api
- **형식**: CSAF 2.0 (Common Security Advisory Framework)
- **제공 기관**: Red Hat, Microsoft, Cisco 등 주요 보안 벤더

---

## ✨ 주요 기능

### 1️⃣ 자동 CVE 수집
- ✅ 최신 보안 권고문에서 CVE 자동 추출
- ✅ 중복 확인 (기존 CVE는 건너뜀)
- ✅ 제품명, 벤더사 정보 정확 파싱
- ✅ CVSS 점수, 위험도, CWE 정보 수집

### 2️⃣ 상세 정보 파싱
| 필드 | 설명 | 샘플 데이터 |
|------|------|-------------|
| **CVE_Code** | CVE ID | CVE-2025-3887 |
| **product** | 영향받는 제품 | Red Hat Enterprise Linux, Red Hat Enterprise Linux AppStream |
| **CVSS_Score** | CVSS 점수 | 8.8 |
| **CVSS_Serverity** | 위험도 | HIGH |
| **cweId** | CWE ID | CWE-121 |
| **descriptions** | 취약점 설명 | A flaw was found in GStreamer H265 Codec Parsing... |
| **effect_version** | 영향받는 버전 | gstreamer1-plugins-bad-free 1.16.1 (RHEL 8.x) |
| **solutions** | 패치/솔루션 | For details on how to apply this update... |
| **datePublished** | 공개일 | 2025-05-22 00:47:04 |
| **dateUpdated** | 업데이트일 | 2025-10-20 11:30:10 |

### 3️⃣ 중복 방지
- ✅ `CVE_Info` 테이블에 이미 존재하는 CVE는 자동으로 건너뜀
- ✅ DB 부하 최소화
- ✅ 안전한 반복 실행 가능

---

## 🚀 사용 방법

### 1. 테스트 모드 (API 확인)

```bash
python circl_cve_collector.py --test
```

**출력 예시:**
```
================================================================================
🧪 CIRCL API 테스트 모드
================================================================================

✅ 10개 CSAF 문서 수신

[Document]
  Title: Red Hat Security Advisory: gstreamer1-plugins-bad-free security update
  Publisher: Red Hat Product Security

[Vulnerabilities] 1개
  [1] CVE ID: CVE-2025-3887
      CVSS Score: 8.8 (HIGH)
      CWE: CWE-121 - Stack-based Buffer Overflow

[Product Tree]
  Vendor: Red Hat
  Products: Red Hat Enterprise Linux, Red Hat Enterprise Linux AppStream
```

### 2. 실제 수집 모드

#### 방법 1: Python 직접 실행

```bash
# 기본 100개 수집
python circl_cve_collector.py

# 개수 지정
python circl_cve_collector.py --limit 50
```

#### 방법 2: 배치 파일 실행 (Windows)

```bash
run_circl_collector.bat
```

**배치 파일은 자동으로 100개 CSAF 문서를 수집합니다.**

---

## 📊 실행 결과 예시

### 수집 중:
```
================================================================================
🚀 CIRCL Vulnerability-Lookup API CVE 수집 시작
================================================================================
📡 수집 개수: 100개 CSAF 문서
🌐 출처: CIRCL (https://vulnerability.circl.lu)
📋 형식: CSAF 2.0 (Common Security Advisory Framework)
================================================================================

✅ 수신 완료: 100개 CSAF 문서
================================================================================

────────────────────────────────────────────────────────────────────────────────
[1/100] 📄 RHSA-2025:9056
  제목: Red Hat Security Advisory: gstreamer1-plugins-bad-free secur...
  CVE: 1개 발견
────────────────────────────────────────────────────────────────────────────────
  ✅ CVE-2025-3887
     제품: Red Hat Enterprise Linux, Red Hat Enterprise Linux AppStream
     CVSS: 8.8 (HIGH)
     CWE: CWE-121
```

### 완료 후:
```
================================================================================
🎉 CIRCL CVE 수집 완료!
================================================================================
📊 수집 통계:
  • CSAF 문서: 100개
  • 총 CVE: 247개
  • ✅ 새로 추가: 35개
  • ⏭️  이미 존재: 212개
  • ❌ 실패: 0개
================================================================================
```

---

## 📁 파일 구조

```
E:\LLama\pythonProject\CVE_BOT\
├── circl_cve_collector.py       # 메인 수집 모듈
├── run_circl_collector.bat      # Windows 실행 스크립트
├── db_manager.py                 # DB 연결/테이블 관리
├── config.json                   # DB 설정 파일
└── logs/
    └── circl_collector_YYYYMMDD.log  # 수집 로그
```

---

## 🔧 고급 설정

### 1. 수집 개수 조절

```python
# config.py 또는 명령줄 인자로 조절
python circl_cve_collector.py --limit 200  # 200개 수집
```

### 2. API Rate Limit

CIRCL API는 **Rate Limit**이 있습니다:
- ✅ 429 에러 발생 시 자동으로 중단
- ✅ 로그에 명확한 오류 메시지 출력
- ⏰ 잠시 후 다시 시도 권장

### 3. 자동 스케줄링 (Windows 작업 스케줄러)

매일 자동으로 최신 CVE 수집:

```xml
작업 이름: CIRCL CVE 수집
트리거: 매일 오전 4시
작업: E:\LLama\pythonProject\CVE_BOT\run_circl_collector.bat
```

---

## 📈 데이터 품질

### ✅ 장점
1. **공신력**: CIRCL은 유럽의 공식 보안 기관
2. **최신성**: 실시간으로 업데이트되는 보안 권고문
3. **상세함**: CSAF 2.0 표준으로 구조화된 데이터
4. **다양성**: Red Hat, Microsoft, Cisco 등 주요 벤더 포함

### ⚠️ 주의사항
1. **Red Hat 중심**: 현재 API는 주로 Red Hat 보안 권고문 제공
2. **CSAF 형식**: 복잡한 중첩 구조 (파싱 로직으로 해결됨)
3. **중복 CVE**: 여러 RHEL 버전에 대한 동일 CVE가 여러 문서에 포함될 수 있음 (중복 체크로 해결)

---

## 🔍 파싱 로직 상세

### 📦 제품 정보 추출

CSAF 문서의 `product_tree.branches`는 다음과 같은 계층 구조:

```
Vendor (Red Hat)
 ├─ Product Family (Red Hat Enterprise Linux)
 │   ├─ Product Name (Red Hat Enterprise Linux AppStream AUS (v.8.6))
 │   ├─ Product Name (Red Hat Enterprise Linux AppStream E4S (v.8.6))
 │   └─ ...
 └─ Architecture (src, i686, x86_64, aarch64, ppc64le, s390x)
     └─ Product Version (gstreamer1-plugins-bad-free-0:1.16.1-3.el8_6.x86_64)
```

**파싱 로직:**
1. `document.publisher.name`에서 Vendor 추출
2. `product_tree.branches[vendor].branches[product_family].name`에서 제품군 추출
3. 버전 정보, 아키텍처 정보 제거하여 간결화
4. 중복 제거 (예: "Red Hat Red Hat" → "Red Hat")
5. 최대 3개 제품만 저장 (200자 제한)

### 📅 날짜 정보 우선순위

1. **datePublished**: `vulnerabilities[].release_date` → `document.tracking.initial_release_date`
2. **dateUpdated**: `document.tracking.current_release_date`
3. **dateReserved**: `vulnerabilities[].discovery_date` → `release_date`

### 🛡️ CVSS 정보

`vulnerabilities[].scores[].cvss_v3`:
- **baseScore** → CVSS_Score
- **baseSeverity** → CVSS_Serverity (CRITICAL/HIGH/MEDIUM/LOW)
- **attackVector** → CVSS_Vertor (NETWORK/ADJACENT/LOCAL/PHYSICAL)
- **vectorString** → CVSS_vertorString (전체 벡터 문자열)

---

## 🔄 다른 CVE 수집 모듈과의 비교

| 특징 | CIRCL API | MITRE CVE List | NVD API |
|------|-----------|----------------|---------|
| **데이터 형식** | CSAF 2.0 | CVE JSON 5.0 | NVD JSON |
| **업데이트 주기** | 실시간 | 매일 | 매일 |
| **제공 정보** | 보안 권고문 | CVE 메타데이터 | CVSS, CPE, 참조 |
| **제품 정보** | ⭐⭐⭐ 상세 | ⭐⭐ 보통 | ⭐⭐⭐ 상세 |
| **Rate Limit** | 있음 (낮음) | 없음 | 있음 (높음) |
| **추천 용도** | Red Hat 제품 | 전체 CVE 목록 | CVSS 상세 |

---

## 🐛 문제 해결 (Troubleshooting)

### 1. API 요청 실패 (HTTP 429)

**증상:**
```
[API 실패] Rate Limit 초과 (429) - 잠시 후 다시 시도
```

**해결 방법:**
- ⏰ 30분~1시간 후 다시 시도
- 📉 `--limit` 값을 줄여서 시도 (예: `--limit 20`)

### 2. CVE ID 없음

**증상:**
```
⚠️  CVE ID 없음 - 건너뜀
```

**원인:**
- CSAF 문서에 `vulnerabilities` 배열이 비어있거나 `cve` 필드가 없음
- 보안 권고문이지만 아직 CVE가 할당되지 않은 경우

**해결 방법:**
- ✅ 정상 동작 - 자동으로 건너뜀

### 3. DB 연결 실패

**증상:**
```
❌ DB 연결 실패 - 종료
```

**해결 방법:**
1. `config.json` 파일 확인
2. MySQL 서버 실행 여부 확인
3. DB 접속 정보 (host, port, user, password) 확인

---

## 📌 활용 예시

### 1. 매일 자동 수집

**Windows 작업 스케줄러**:
```
작업 이름: CIRCL CVE 일일 수집
트리거: 매일 오전 4시 30분
작업: E:\LLama\pythonProject\CVE_BOT\run_circl_collector.bat
```

### 2. 수동 대량 수집

최대 500개 CSAF 문서 수집:
```bash
python circl_cve_collector.py --limit 500
```

⚠️ **주의**: Rate Limit에 걸릴 수 있으므로 100~200개 권장!

### 3. 특정 제품만 필터링

**향후 개선 예정**: 현재는 모든 CVE 수집, 추후 제품 필터 기능 추가 가능

---

## 📊 성능 지표

### 테스트 결과 (2025.10.20)

| 항목 | 결과 |
|------|------|
| **CSAF 문서** | 50개 |
| **총 CVE** | 119개 |
| **처리 시간** | 약 35초 |
| **평균 속도** | 약 3.4 CVE/초 |
| **중복 제거** | 119개 (100%) |

### 예상 처리량

| CSAF 문서 개수 | 예상 CVE 수 | 예상 시간 |
|----------------|-------------|-----------|
| 50개 | ~120개 | ~35초 |
| 100개 | ~240개 | ~70초 |
| 200개 | ~480개 | ~140초 |

---

## 🔗 관련 문서

- **CSAF 2.0 표준**: https://docs.oasis-open.org/csaf/csaf/v2.0/
- **CIRCL 공식 사이트**: https://www.circl.lu/
- **Vulnerability Lookup**: https://vulnerability.circl.lu/

---

## 📝 변경 이력

| 날짜 | 버전 | 변경 사항 |
|------|------|-----------|
| 2025.10.20 | 1.0.0 | ✅ 최초 생성 - CSAF 2.0 파싱 지원 |
| | | ✅ 제품 정보 정확 추출 (vendor + product) |
| | | ✅ 중복 CVE 자동 제거 |
| | | ✅ CVSS, CWE, 날짜 정보 파싱 |

---

## 💡 팁

### 1. 다른 CVE 수집기와 함께 사용

```bash
# 1. MITRE 로컬 CVE 임포트 (대량 - 1회성)
python import_local_cve_data.py

# 2. CIRCL API 수집 (최신 보안 권고문 - 매일)
python circl_cve_collector.py --limit 100

# 3. Github POC 수집 (POC 코드 - 매일)
python run_collect_cve_info.py
```

### 2. 로그 파일 확인

상세한 수집 과정은 로그 파일에서 확인:
```bash
type logs\circl_collector_20251020.log
```

### 3. 수집된 CVE 확인

웹 대시보드에서 확인:
```
http://www.ai-platform.store:3000/cve
```

필터:
- 최신 등록순 → 방금 수집된 CVE가 상단에 표시
- 제품 검색 → "Red Hat" 검색

---

## ⚙️ 커스터마이징

### 1. 수집 대상 변경

다른 API 엔드포인트 사용:
```python
# circl_cve_collector.py 수정
API_LAST_URL = "https://vulnerability.circl.lu/api/browse"  # 다른 엔드포인트
```

### 2. 파싱 로직 수정

제품명 추출 방식 변경:
```python
# extract_vendor_and_products() 함수 수정
# 더 상세한 제품명 또는 버전 정보 포함
```

### 3. 필터 추가

특정 vendor만 수집:
```python
# parse_csaf_to_cve_info() 함수에 추가
if vendor_name != "Red Hat":
    continue  # Red Hat만 수집
```

---

## 📞 문의

**문제 발생 시**:
1. 로그 파일 확인 (`logs/circl_collector_*.log`)
2. `--test` 모드로 API 상태 확인
3. DB 연결 및 설정 확인

**개선 제안**:
- 다른 vendor 지원 추가
- 제품별 필터링 기능
- 자동 스케줄링 GUI

---

**🎉 CIRCL CVE 수집기로 최신 보안 정보를 손쉽게 관리하세요!**

