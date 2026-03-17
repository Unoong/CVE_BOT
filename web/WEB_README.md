# CVE Bot 웹 애플리케이션

파란색 테마의 세련된 CVE 정보 시스템 웹사이트입니다.

## 🚀 실행 방법

### 1. 백엔드 서버 실행 (포트 32577)

```bash
cd E:\LLama\pythonProject\CVE_BOT\web
node server.js
```

### 2. 프론트엔드 실행 (별도 터미널)

```bash
cd E:\LLama\pythonProject\CVE_BOT\web\client
npm run dev
```

### 3. 브라우저에서 접속

```
http://localhost:3000
```

## 🔐 기본 관리자 계정

- **ID**: admin
- **PW**: admin1234

## 📋 주요 기능

### 모든 사용자
- 로그인/회원가입/ID·PW 찾기
- CVE 정보 조회
- 자유게시판 (글쓰기, 파일 업로드, 에디터)

### 분석가 + 운영자
- DB 직접 조회 (Github_CVE_Info, CVE_Info, CVE_Packet_AI_Analysis)

### 운영자 전용
- 사용자 관리 (권한 변경, 삭제)
- 로그 확인 (CVE 수집 로그, AI 분석 로그, 로그인 로그)

## 🎨 디자인

- **테마**: 파란색 (#1976d2)
- **UI 프레임워크**: Material-UI
- **스타일**: 깔끔하고 세련된 모던 디자인
- **반응형**: 모바일/태블릿/데스크톱 지원

## 📊 페이지 구성

1. **대시보드**: CVE 통계, 최신 정보
2. **CVE 목록**: 페이징, 필터링, CVSS 점수 표시
3. **CVE 상세**: CVSS, CWE, 영향 버전, POC 목록
4. **POC 상세**: GitHub 정보, README 번역, AI 분석 결과
5. **AI 분석 결과**: 공격 단계, MITRE ATT&CK, Snort 규칙
6. **게시판**: CRUD, 파일 업로드, Quill 에디터
7. **DB 조회**: 실시간 DB 조회
8. **로그 확인**: 수집/분석/로그인 로그
9. **관리자**: 사용자/권한 관리

## 🔑 권한 체계

- **user (일반 사용자)**: CVE 조회, 게시판
- **analyst (분석가)**: + DB 조회
- **admin (운영자)**: + 로그 확인, 관리자 패널

## 🛠️ 기술 스택

### 백엔드
- Node.js + Express
- MySQL2
- JWT 인증
- bcrypt 비밀번호 암호화

### 프론트엔드
- React 19
- Material-UI
- React Router
- Axios
- React Quill (에디터)

## 📦 빌드

```bash
cd E:\LLama\pythonProject\CVE_BOT\web\client
npm run build
```

## ⚠️ 주의사항

- 백엔드와 프론트엔드를 **모두** 실행해야 합니다
- 포트 32577 (백엔드), 3000 (프론트엔드)
- MySQL 서버 실행 필요 (포트 7002)
- TOTORO 데이터베이스 필요

## 🎯 개발 환경

- Windows 10/11
- Node.js 16 이상
- MySQL 8.0

## 📧 문제 해결

### 백엔드 연결 오류
```bash
# MySQL 연결 확인
mysql -h localhost -P 7002 -u root -p
```

### CORS 오류
- `server.js`에서 CORS가 이미 활성화되어 있습니다

### 포트 충돌
- package.json 또는 server.js에서 포트 변경 가능

