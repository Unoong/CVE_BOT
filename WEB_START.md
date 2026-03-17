# CVE Bot 웹사이트 실행 가이드

## 🎯 완성된 웹 애플리케이션

파란색 테마의 세련된 React + Node.js CVE 정보 시스템이 완성되었습니다!

## 📁 웹 프로젝트 구조

```
E:\LLama\pythonProject\CVE_BOT\web\
├── server.js                 # Express 백엔드 (포트 32577)
├── package.json             # 백엔드 패키지
├── uploads/                 # 업로드 파일
├── login_log.txt           # 로그인 로그
└── client/                 # React 프론트엔드
    ├── src/
    │   ├── App.jsx          # 메인 앱
    │   ├── components/
    │   │   └── Layout.jsx   # 레이아웃
    │   └── pages/
    │       ├── Login.jsx    # 로그인
    │       ├── Register.jsx # 회원가입
    │       ├── FindAccount.jsx
    │       ├── Dashboard.jsx
    │       ├── CVEList.jsx
    │       ├── CVEDetail.jsx
    │       ├── POCDetail.jsx  # AI 분석 결과
    │       ├── Board.jsx
    │       ├── BoardWrite.jsx
    │       ├── BoardDetail.jsx
    │       ├── DBQuery.jsx    # DB 조회
    │       ├── LogsView.jsx   # 로그 확인
    │       └── AdminPanel.jsx # 관리자
    └── package.json
```

## 🚀 실행 방법

### 1단계: 백엔드 서버 실행

```bash
cd E:\LLama\pythonProject\CVE_BOT\web
node server.js
```

출력 예시:
```
================================================================================
🚀 CVE Bot 웹서버 실행 중
📍 주소: http://localhost:32577
🔐 기본 관리자: ID=admin, PW=admin1234
================================================================================
```

### 2단계: 프론트엔드 서버 실행 (새 터미널)

```bash
cd E:\LLama\pythonProject\CVE_BOT\web\client
npm run dev
```

### 3단계: 브라우저 접속

```
http://localhost:3000
```

## 🔐 로그인 정보

### 기본 관리자 계정
- **ID**: admin
- **PW**: admin1234
- **권한**: 운영자 (모든 기능 사용 가능)

### 권한 체계
- **user (일반사용자)**: CVE 조회, 게시판
- **analyst (분석가)**: + DB 조회
- **admin (운영자)**: + 로그 확인, 사용자 관리

## 🎨 웹사이트 기능

### 📱 모든 사용자
✅ 로그인 / 회원가입 / ID·PW 찾기
✅ CVE 정보 조회 (목록, 상세)
✅ POC 상세 보기 (AI 분석 결과 포함)
✅ 자유게시판 (글쓰기, 수정, 삭제)
✅ 파일 업로드
✅ Quill 에디터

### 📊 분석가 + 운영자
✅ 실시간 DB 조회
- Github_CVE_Info
- CVE_Info
- CVE_Packet_AI_Analysis

### 👑 운영자 전용
✅ 프로그램 로그 확인
- CVE 수집 로그
- AI 분석 로그
- 로그인 로그 (ID/PW 기록)

✅ 사용자 관리
- 권한 변경
- 사용자 삭제
- 계정 정보 조회

## 🎨 디자인 특징

### 파란색 테마
- **Primary**: #1976d2
- **Secondary**: #2196f3
- **배경**: 그라데이션 (#1976d2 → #42a5f5)

### UI/UX
- Material-UI 최신 버전
- 반응형 디자인 (모바일/태블릿/데스크톱)
- 부드러운 애니메이션
- 카드 기반 레이아웃
- 직관적인 네비게이션

## 📊 주요 페이지

### 1. 로그인 페이지
- 파란색 그라데이션 배경
- 세련된 로그인 카드
- ID/PW 찾기, 회원가입 링크

### 2. 대시보드
- CVE 통계 카드 (그라데이션)
- 시스템 개요
- 최신 정보

### 3. CVE 목록
- 페이징 (10/20/50/100개)
- CVSS 점수, 심각도 표시
- POC 개수 표시
- 최신순 정렬

### 4. CVE 상세
- CVE 헤더 (파란색 그라데이션)
- CVE 정보 (CVSS, CWE, 영향 버전)
- 설명, 해결방법
- 관련 POC 목록

### 5. POC 상세 ⭐
- GitHub 정보
- README 한국어 번역
- **AI 모델 분석 결과**
  - CVE 요약
  - 공격 단계별 분석
  - 패킷 정보 (HTTP 요청)
  - MITRE ATT&CK 매핑
  - Snort 탐지 규칙
  - 대응 방법

### 6. 자유게시판
- 테이블 뷰
- Quill 에디터
- 파일 업로드
- 조회수

### 7. DB 조회
- 테이블 선택
- 페이징
- 전체 필드 표시

### 8. 로그 확인
- CVE 수집 로그
- AI 분석 로그
- 로그인 로그 (ID/PW 포함)
- 다크 테마 코드 뷰

### 9. 관리자 패널
- 사용자 목록
- 권한 변경 (user/analyst/admin)
- 사용자 삭제

## 🔧 기술 스택

### Backend
- **Node.js** + **Express** (포트 32577)
- **MySQL2** (풀 사용)
- **JWT** 인증
- **bcrypt** 암호화
- **multer** 파일 업로드

### Frontend
- **React 19** + **Vite**
- **Material-UI** (파란색 테마)
- **React Router** (라우팅)
- **Axios** (HTTP 클라이언트)
- **React Quill** (에디터)

## 📝 로그인 로그 예시

`login_log.txt`:
```
[2025-10-08T05:30:00.000Z] SUCCESS - ID: admin, PW: admin1234
[2025-10-08T05:31:00.000Z] FAILED - ID: test, PW: wrongpass
[2025-10-08T05:32:00.000Z] SUCCESS - ID: analyst1, PW: pass123
```

## 🔄 개발 모드

### 백엔드 (자동 재시작)
```bash
npm install -g nodemon
cd E:\LLama\pythonProject\CVE_BOT\web
nodemon server.js
```

### 프론트엔드 (HMR)
```bash
cd E:\LLama\pythonProject\CVE_BOT\web\client
npm run dev
```

## 🌐 접속 정보

- **프론트엔드**: http://localhost:3000
- **백엔드 API**: http://localhost:32577/api
- **파일 업로드**: http://localhost:32577/uploads

## ⚠️ 주의사항

1. MySQL 서버 실행 필요 (포트 7002)
2. TOTORO 데이터베이스 필요
3. 백엔드와 프론트엔드 모두 실행
4. Node.js 16 이상 필요

## 🎉 웹사이트 완성!

세련되고 이쁜 파란색 테마의 CVE 정보 시스템이 완성되었습니다!

