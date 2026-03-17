# 취약점 관리 시스템 - 설치 및 실행 가이드

> **작성일**: 2025년 10월 12일

---

## 📋 목차

1. [사전 요구사항](#사전-요구사항)
2. [데이터베이스 설정](#데이터베이스-설정)
3. [Python 수집 시스템 설정](#python-수집-시스템-설정)
4. [웹 서버 설정](#웹-서버-설정)
5. [실행 방법](#실행-방법)
6. [외부 수집 모듈 설정](#외부-수집-모듈-설정)

---

## 🔧 사전 요구사항

### 필수 소프트웨어

| 소프트웨어 | 버전 | 용도 | 다운로드 |
|----------|------|------|---------|
| **Python** | 3.8 이상 | 수집 시스템 | https://www.python.org/downloads/ |
| **Node.js** | 14 이상 | 웹 서버 | https://nodejs.org/ |
| **MySQL** | 8.0 | 데이터베이스 | https://dev.mysql.com/downloads/ |
| **Git** | 최신 | 코드 관리 | https://git-scm.com/ |
| **Gemini CLI** | 최신 | AI 분석 | `npm install -g gemini-ai` |

### 추천 도구

| 도구 | 용도 |
|-----|------|
| **VS Code** | 코드 편집기 |
| **MySQL Workbench** | DB 관리 도구 |
| **Postman** | API 테스트 |

---

## 🗄️ 데이터베이스 설정

### 1. MySQL 설치 확인

```bash
# MySQL 버전 확인
mysql --version

# MySQL 서비스 시작 (Windows)
net start MySQL80

# MySQL 서비스 시작 (Linux/Mac)
sudo systemctl start mysql
```

### 2. 데이터베이스 생성

```sql
-- MySQL 접속
mysql -u root -p

-- 데이터베이스 생성
CREATE DATABASE totoro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 사용자 생성 (선택 사항)
CREATE USER 'cve_admin'@'localhost' IDENTIFIED BY '비밀번호';
GRANT ALL PRIVILEGES ON totoro.* TO 'cve_admin'@'localhost';
FLUSH PRIVILEGES;
```

### 3. 데이터베이스 정보

| 항목 | 값 | 비고 |
|-----|-----|------|
| **데이터베이스명** | `totoro` | |
| **호스트** | `localhost` | |
| **포트** | `3306` | MySQL 기본 포트 |
| **사용자** | `root` (또는 cve_admin) | |
| **비밀번호** | `****` | 보안상 마스킹 |
| **인코딩** | `utf8mb4` | 한글 지원 |

### 4. 테이블 자동 생성

시스템 첫 실행 시 자동으로 생성됩니다:
- Python 수집 시스템 실행 시: Github_CVE_Info, CVE_Info, CVE_Packet_AI_Analysis, CVE_Integrated_Data
- 웹 서버 실행 시: users, board_posts, chat_messages, api_tokens 등

---

## 🐍 Python 수집 시스템 설정

### 1. 프로젝트 클론 (또는 복사)

```bash
cd E:\LLama\pythonProject
# Git 사용 시
git clone [repository-url] CVE_BOT
cd CVE_BOT
```

### 2. 가상 환경 생성 (권장)

```bash
# 가상 환경 생성
python -m venv .venv

# 가상 환경 활성화 (Windows)
.venv\Scripts\activate

# 가상 환경 활성화 (Linux/Mac)
source .venv/bin/activate
```

### 3. 필수 패키지 설치

```bash
# requirements.txt가 있는 경우
pip install -r requirements.txt

# 또는 개별 설치
pip install mysql-connector-python
pip install requests
pip install PyGithub
pip install deep-translator
pip install urllib3
```

### 4. Gemini CLI 설정

```bash
# Gemini CLI 설치
npm install -g gemini-ai

# Gemini API 키 설정 (환경 변수)
# Windows
setx GEMINI_API_KEY "your-api-key"

# Linux/Mac
export GEMINI_API_KEY="your-api-key"

# Gemini 로그인
gemini login
```

### 5. config.json 설정

`config.json` 파일을 프로젝트 루트에 생성:

```json
{
    "database": {
        "host": "localhost",
        "port": 3306,
        "user": "root",
        "password": "****",
        "database": "totoro"
    },
    "github": {
        "token": "your-github-token"
    },
    "collection": {
        "max_pages": 1000,
        "target_years": [2025, 2024],
        "sort_by": "updated",
        "sort_order": "desc",
        "auto_collect_cve_info": true,
        "auto_create_integrated_data": true
    },
    "log_level": "INFO"
}
```

**설정 설명**:

| 항목 | 설명 | 예시 값 |
|-----|------|--------|
| `database.host` | MySQL 서버 주소 | `localhost` |
| `database.port` | MySQL 포트 | `3306` |
| `database.user` | DB 사용자명 | `root` |
| `database.password` | DB 비밀번호 | `****` (보안) |
| `database.database` | 데이터베이스명 | `totoro` |
| `github.token` | GitHub Personal Access Token | GitHub Settings에서 발급 |
| `max_pages` | 최대 수집 페이지 수 | `1000` |
| `target_years` | 수집 대상 연도 | `[2025, 2024]` 또는 `"current"` |
| `sort_by` | 정렬 기준 | `updated`, `created`, `stars`, `best-match` |
| `sort_order` | 정렬 순서 | `desc` (최신순), `asc` (오래된순) |
| `auto_collect_cve_info` | CVE 정보 자동 수집 | `true` / `false` |
| `auto_create_integrated_data` | 통합 테이블 자동 생성 | `true` / `false` |

**GitHub Token 발급 방법**:
1. GitHub 로그인 → Settings
2. Developer settings → Personal access tokens → Tokens (classic)
3. Generate new token → `public_repo` 권한 체크
4. 생성된 토큰 복사하여 config.json에 입력

### 6. 폴더 구조 확인

```
CVE_BOT/
├── main.py                      # GitHub POC 수집
├── run_ai_analysis.py           # AI 분석 실행
├── cve_info_collector.py        # CVE 정보 수집
├── db_manager.py                # DB 관리
├── github_collector.py          # GitHub API
├── translator.py                # 번역
├── file_manager.py              # 파일 관리
├── ai_analyzer.py               # AI 분석
├── logger.py                    # 로깅
├── config.json                  # 설정 파일
├── requirements.txt             # Python 패키지 목록
├── CVE/                         # 다운로드된 CVE 파일 (자동 생성)
├── logs/                        # 로그 파일 (자동 생성)
└── web/                         # 웹 서버 폴더
```

---

## 🌐 웹 서버 설정

### 1. 웹 서버 디렉토리 이동

```bash
cd E:\LLama\pythonProject\CVE_BOT\web
```

### 2. Node.js 패키지 설치

```bash
# 백엔드 패키지 설치
npm install

# 프론트엔드 디렉토리 이동
cd client
npm install
cd ..
```

### 3. 환경 설정

#### 백엔드 설정

`web/server.js` 파일 확인 (일반적으로 수정 불필요):

```javascript
// MySQL 연결 설정
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '****',  // DB 비밀번호
    database: 'totoro',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// 포트 설정
const HTTP_PORT = 32577;
const HTTPS_PORT = 32578;
```

#### 이메일 설정 (Nodemailer)

`server.js`에서 이메일 설정 확인:

```javascript
const emailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'gpt8354@gmail.com',
        pass: '****'  // Gmail 앱 비밀번호
    }
});
```

**Gmail 앱 비밀번호 생성**:
1. Google 계정 → 보안
2. 2단계 인증 활성화
3. 앱 비밀번호 생성
4. 생성된 16자리 비밀번호를 `pass`에 입력

#### 프론트엔드 설정

`web/client/src/config.js` 확인 (자동 설정):

```javascript
const getApiUrl = () => {
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  return `${protocol}//${hostname}:32577/api`;
};

export const API_URL = getApiUrl();
```

### 4. HTTPS 인증서 생성

```bash
cd E:\LLama\pythonProject\CVE_BOT\web

# OpenSSL로 자체 서명 인증서 생성
openssl req -nodes -new -x509 -keyout server.key -out server.cert
```

입력 항목 (예시):
- Country Name: `KR`
- State: `Seoul`
- Locality: `Seoul`
- Organization: `Company`
- Common Name: `localhost` (또는 서버 IP)

**주의**: 자체 서명 인증서는 브라우저 경고가 발생합니다. 프로덕션 환경에서는 Let's Encrypt 사용을 권장합니다.

### 5. 폴더 구조 확인

```
web/
├── server.js                    # Express 서버
├── package.json                 # Node.js 패키지 정보
├── server.key                   # HTTPS 개인키
├── server.cert                  # HTTPS 인증서
├── logger.config.json           # 로그 설정
├── utils/
│   └── logger.js                # 로거 유틸리티
├── uploads/                     # 업로드 파일 (자동 생성)
├── client/                      # React 프론트엔드
│   ├── package.json
│   ├── vite.config.js
│   ├── public/
│   │   ├── index.html
│   │   └── logo.png             # CI 로고
│   └── src/
│       ├── App.jsx
│       ├── config.js
│       ├── components/
│       ├── pages/
│       └── services/
└── mitre_attack_matrix.csv      # MITRE ATT&CK 데이터
```

---

## 🚀 실행 방법

### Python 수집 시스템 실행

#### 1. GitHub POC 수집

```bash
cd E:\LLama\pythonProject\CVE_BOT
python main.py
```

**실행 내용**:
- GitHub에서 CVE 저장소 검색
- ZIP 파일 다운로드
- README 번역
- DB 저장

**실행 주기**: 수동 또는 Windows 작업 스케줄러로 자동화

#### 2. AI 분석 실행

```bash
cd E:\LLama\pythonProject\CVE_BOT
python run_ai_analysis.py
```

**실행 내용**:
- AI_chk = 'N'인 POC 분석
- Gemini Pro로 자동 분석
- 공격 단계, MITRE, Snort 룰 생성
- DB 저장

**실행 주기**: 10분마다 자동 반복 (무한 루프)

**백그라운드 실행** (Linux/Mac):
```bash
nohup python run_ai_analysis.py &
```

**Windows 서비스 등록**:
```bash
# 작업 스케줄러 사용
# 또는 pythonw.exe로 백그라운드 실행
start /B pythonw run_ai_analysis.py
```

### 웹 서버 실행

#### 개발 모드 (프론트엔드 포함)

```bash
cd E:\LLama\pythonProject\CVE_BOT\web

# 터미널 1: 백엔드 실행
node server.js

# 터미널 2: 프론트엔드 개발 서버 실행
cd client
npm run dev
```

**접속 주소**:
- 프론트엔드 개발 서버: `http://localhost:3000`
- 백엔드 API: `http://localhost:32577/api`
- 백엔드 HTTPS: `https://localhost:32578/api`

#### 프로덕션 모드

```bash
cd E:\LLama\pythonProject\CVE_BOT\web

# 프론트엔드 빌드
cd client
npm run build
cd ..

# 백엔드만 실행
node server.js
```

**접속 주소**:
- 웹사이트: `http://localhost:32577` 또는 `https://localhost:32578`
- API: `http://localhost:32577/api` 또는 `https://localhost:32578/api`

#### 백그라운드 실행

**Windows (start 명령)**:
```bash
start /B node server.js
```

**Linux/Mac (pm2 사용)**:
```bash
# pm2 설치
npm install -g pm2

# 서버 시작
pm2 start server.js

# 상태 확인
pm2 status

# 로그 확인
pm2 logs

# 서버 중지
pm2 stop server.js
```

### 편의 스크립트 (배치 파일)

#### run.bat (웹 서버 시작)

```batch
@echo off
cd E:\LLama\pythonProject\CVE_BOT\web
echo ========================================
echo 취약점 관리 시스템 웹 서버 시작
echo ========================================
node server.js
pause
```

#### stop.bat (웹 서버 종료)

```batch
@echo off
echo ========================================
echo 취약점 관리 시스템 웹 서버 종료
echo ========================================
taskkill /F /IM node.exe
pause
```

실행 방법:
- `run.bat` 더블클릭 → 서버 시작
- `stop.bat` 더블클릭 → 서버 종료

---

## 🔗 외부 수집 모듈 설정

외부 PC에서 CVE 데이터를 수집하여 카카오톡으로 전송하는 시스템입니다.

### 1. API 토큰 발급

웹사이트에서 관리자 계정으로 로그인:

1. **API 토큰 메뉴** 접속 (관리자 전용)
2. **새 토큰 생성** 클릭
3. 정보 입력:
   - 이름: `회사 PC 수집 모듈`
   - 만료일: (선택 사항)
   - 권한: `cve:read`, `poc:read`, `analysis:read` 체크
4. **생성** 버튼 클릭
5. **생성된 토큰 복사** (한 번만 표시됨!)

### 2. 외부 PC에 파일 복사

```
cve_api_collector.py  # 수집 스크립트
```

### 3. config 설정

`cve_api_collector.py` 파일 열기:

```python
class Config:
    # API 서버 주소
    API_BASE_URL = 'http://서버IP:32577/api'  # 또는 https://서버IP:32578/api
    
    # API 토큰 (웹사이트에서 발급)
    API_TOKEN = '복사한-토큰-값'
    
    # 수집 설정
    PAGE_SIZE = 50
    REPEAT_INTERVAL = 300  # 5분 (초 단위)
    
    # SSL 인증서 검증 (자체 서명 인증서는 False)
    VERIFY_SSL = False
```

### 4. 실행

```bash
# Python 가상 환경 생성 (선택)
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac

# 필수 패키지 설치
pip install requests urllib3

# 실행
python cve_api_collector.py
```

### 5. 카카오톡 연동 (선택 사항)

`cve_api_collector.py`에서 카카오톡 전송 코드 추가:

```python
# 409-410번 라인
# ▼▼▼ 여기에 카카오톡 전송 코드 추가 ▼▼▼
send_kakao_message(msg)  # Intent 제어 함수 호출
# ▲▲▲ 여기에 카카오톡 전송 코드 추가 ▲▲▲
```

**Intent 제어 예시** (회사 내부 솔루션 사용):
```python
def send_kakao_message(message):
    # Intent 제어 모듈 호출
    # 구체적인 구현은 회사 환경에 따라 다름
    pass
```

### 6. 백그라운드 실행

**Windows (pythonw.exe)**:
```batch
start /B pythonw cve_api_collector.py
```

**Linux/Mac (nohup)**:
```bash
nohup python cve_api_collector.py &
```

**작업 스케줄러 (Windows)**:
1. 작업 스케줄러 열기
2. 기본 작업 만들기
3. 트리거: 시스템 시작 시
4. 작업: `python.exe 경로` `cve_api_collector.py 경로`

---

## ✅ 설치 확인

### 1. Python 수집 시스템

```bash
# main.py 실행 후 확인사항
- GitHub 저장소 검색 성공
- ZIP 파일 다운로드 성공
- DB 저장 성공
- CVE/ 폴더에 파일 생성 확인
```

### 2. AI 분석 시스템

```bash
# run_ai_analysis.py 실행 후 확인사항
- Gemini API 연결 성공
- AI_chk = 'N'인 데이터 분석
- CVE_Packet_AI_Analysis 테이블에 데이터 저장
```

### 3. 웹 서버

```bash
# node server.js 실행 후 확인사항
- HTTP 서버: http://localhost:32577 접속 가능
- HTTPS 서버: https://localhost:32578 접속 가능 (경고 무시)
- 로그인 페이지 정상 표시
```

### 4. 외부 수집 모듈

```bash
# cve_api_collector.py 실행 후 확인사항
- 서버 연결 테스트 성공
- CVE 데이터 수집 성공
- status 업데이트 성공
```

---

## 🆘 문제 해결

### Python 패키지 설치 오류

```bash
# pip 업그레이드
python -m pip install --upgrade pip

# 프록시 환경
pip install --proxy http://proxy:port package-name

# 관리자 권한 필요
# Windows: 관리자 권한으로 CMD 실행
# Linux/Mac: sudo pip install package-name
```

### MySQL 연결 오류

```bash
# MySQL 서비스 확인
net start MySQL80  # Windows
sudo systemctl status mysql  # Linux

# 포트 확인
netstat -ano | findstr :3306  # Windows
netstat -tulpn | grep :3306   # Linux

# 방화벽 확인
# MySQL 포트 3306 열기
```

### Node.js 패키지 설치 오류

```bash
# npm 캐시 삭제
npm cache clean --force

# node_modules 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install
```

### 외부 접속 안 됨

```bash
# 방화벽 포트 열기
- HTTP: 32577
- HTTPS: 32578

# IP 바인딩 확인
- server.js: app.listen(PORT, '0.0.0.0')
- vite.config.js: server: { host: '0.0.0.0' }
```

---

**문서 작성**: 2025년 10월 12일  
**최종 수정**: 2025년 10월 12일

