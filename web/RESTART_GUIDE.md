# 🔄 서버 재시작 가이드

## ❗ 변경사항이 적용되지 않을 때

변경사항이 적용되지 않는 가장 흔한 이유:

1. **브라우저 캐시** - 이전 파일이 캐시에 남아있음
2. **프로세스 중복** - 이전 서버가 아직 실행 중
3. **핫 리로드 실패** - Vite 개발 서버가 변경사항을 감지하지 못함
4. **포트 충돌** - 포트가 이미 사용 중

---

## 🚀 해결 방법 (권장 순서)

### ✅ 방법 1: 완전 재시작 (가장 확실)

```bash
# 1단계: 기존 서버 완전 종료
E:\LLama\pythonProject\CVE_BOT\web\stop.bat

# 2단계: 재시작
E:\LLama\pythonProject\CVE_BOT\web\restart.bat

# 3단계: 브라우저에서 강제 새로고침
Ctrl + Shift + R  (또는 Ctrl + F5)
```

### ✅ 방법 2: 수동 재시작

```bash
# 1단계: stop.bat 실행
stop.bat

# 2단계: 포트 확인 (선택사항)
check_port.bat

# 3단계: run.bat 실행
run.bat

# 4단계: 브라우저 강제 새로고침
Ctrl + Shift + R
```

### ✅ 방법 3: 개별 서버 재시작

#### 백엔드만 재시작
```bash
# 백엔드 CMD 창에서 Ctrl + C
# 그 후:
cd E:\LLama\pythonProject\CVE_BOT\web
node server.js
```

#### 프론트엔드만 재시작
```bash
# 프론트엔드 CMD 창에서 Ctrl + C
# 그 후:
cd E:\LLama\pythonProject\CVE_BOT\web\client
npm run dev
```

---

## 🔧 문제별 해결 방법

### 1️⃣ 브라우저 캐시 문제

#### 증상
- 코드는 변경했는데 화면에 반영 안 됨
- 콘솔에 에러는 없음
- 서버는 정상 실행 중

#### 해결
```
Chrome/Edge:
Ctrl + Shift + R  (강제 새로고침)
또는
Ctrl + Shift + Delete → 캐시 삭제

Firefox:
Ctrl + F5  (강제 새로고침)
```

### 2️⃣ 포트 충돌 문제

#### 증상
- `EADDRINUSE: address already in use :::32577` 에러
- `EADDRINUSE: address already in use :::3000` 에러

#### 해결
```bash
# 방법 1: stop.bat으로 모든 Node.js 종료
stop.bat

# 방법 2: 수동으로 특정 포트 프로세스 종료
# 32577 포트 사용 프로세스 찾기
netstat -ano | findstr :32577

# PID 확인 후 종료 (예: PID가 12345인 경우)
taskkill /F /PID 12345

# 3000 포트도 동일하게
netstat -ano | findstr :3000
taskkill /F /PID [PID번호]
```

### 3️⃣ 모듈 변경 (package.json 수정 시)

#### 증상
- 새 패키지를 설치했는데 동작 안 됨
- `Cannot find module` 에러

#### 해결
```bash
# 프론트엔드 (client 폴더)
cd E:\LLama\pythonProject\CVE_BOT\web\client
npm install
npm run dev

# 백엔드 (web 폴더)
cd E:\LLama\pythonProject\CVE_BOT\web
npm install
node server.js
```

### 4️⃣ Vite 핫 리로드 실패

#### 증상
- 파일을 저장했는데 자동 새로고침 안 됨
- 콘솔에 변경 감지 메시지가 없음

#### 해결
```bash
# 프론트엔드 CMD 창에서
Ctrl + C  (종료)

# 재시작
npm run dev

# 또는 캐시 삭제 후 재시작
npm cache clean --force
npm run dev
```

---

## 📋 체크리스트

변경사항이 적용되지 않을 때 순서대로 확인:

- [ ] 1. **파일 저장 확인** - 파일을 저장했는지 확인 (Ctrl + S)
- [ ] 2. **서버 재시작** - `restart.bat` 실행
- [ ] 3. **브라우저 캐시 삭제** - Ctrl + Shift + R
- [ ] 4. **포트 확인** - `check_port.bat` 실행
- [ ] 5. **프로세스 확인** - 작업 관리자에서 node.exe 중복 확인
- [ ] 6. **콘솔 에러 확인** - 백엔드/프론트엔드 CMD 창 확인
- [ ] 7. **브라우저 개발자 도구** - F12 → Console 탭에서 에러 확인

---

## 🎯 특정 상황별 가이드

### 백엔드 API 변경 (server.js 수정)
```bash
1. 백엔드 CMD 창에서 Ctrl + C
2. node server.js
3. 브라우저 새로고침 (F5)
```

### 프론트엔드 UI 변경 (.jsx 파일 수정)
```bash
1. 파일 저장 (Ctrl + S)
2. 자동 새로고침 대기 (2-3초)
3. 안 되면 브라우저 강제 새로고침 (Ctrl + Shift + R)
```

### 환경 설정 변경 (config.js, logger.config.json 등)
```bash
1. stop.bat 실행
2. restart.bat 실행
3. 브라우저 강제 새로고침 (Ctrl + Shift + R)
```

### DB 조회 API 같은 신규 기능 추가
```bash
1. stop.bat 실행 (모든 서버 종료)
2. restart.bat 실행 (완전 재시작)
3. 브라우저 캐시 완전 삭제:
   - Ctrl + Shift + Delete
   - "캐시된 이미지 및 파일" 선택
   - "시간 범위": 전체 기간
   - "삭제" 클릭
4. 브라우저 닫고 다시 열기
5. http://localhost:3000 접속
```

---

## 🛠️ 새로 추가된 배치 파일

### `restart.bat` ⭐ (권장)
- 기존 프로세스 자동 종료
- 백엔드/프론트엔드 자동 재시작
- 브라우저 자동 열기
- 가장 확실한 방법!

```bash
E:\LLama\pythonProject\CVE_BOT\web\restart.bat
```

### `check_port.bat`
- 포트 사용 상태 확인
- 32577, 3000 포트 체크
- 문제 진단용

```bash
E:\LLama\pythonProject\CVE_BOT\web\check_port.bat
```

### `stop.bat`
- 모든 Node.js 프로세스 종료
- 재시작 전 사용

```bash
E:\LLama\pythonProject\CVE_BOT\web\stop.bat
```

### `run.bat`
- 서버 시작
- 처음 시작할 때 사용

```bash
E:\LLama\pythonProject\CVE_BOT\web\run.bat
```

---

## 💡 자주 하는 실수

### ❌ 실수 1: 브라우저 캐시
많은 경우 코드는 정상인데 브라우저 캐시가 문제입니다.
**항상 Ctrl + Shift + R로 강제 새로고침!**

### ❌ 실수 2: 이전 프로세스가 살아있음
`run.bat`을 여러 번 실행하면 프로세스가 중복됩니다.
**restart.bat 사용 또는 stop.bat 후 run.bat!**

### ❌ 실수 3: 잘못된 폴더에서 실행
```bash
# ❌ 잘못
E:\LLama\pythonProject\CVE_BOT\run.bat  (없음)

# ✅ 올바름
E:\LLama\pythonProject\CVE_BOT\web\run.bat
E:\LLama\pythonProject\CVE_BOT\web\restart.bat
```

### ❌ 실수 4: 파일을 저장 안 함
IDE에서 파일을 수정했으면 **반드시 저장 (Ctrl + S)!**

---

## 🔍 디버깅 팁

### 백엔드 로그 확인
```bash
# logger.config.json 파일 열기
E:\LLama\pythonProject\CVE_BOT\web\logger.config.json

# logLevel을 "debug"로 변경
{
  "logLevel": "debug"
}

# 서버 재시작
restart.bat
```

### 프론트엔드 콘솔 확인
```
브라우저에서:
1. F12 (개발자 도구 열기)
2. Console 탭 선택
3. 에러 메시지 확인
4. Network 탭에서 API 요청 확인
```

### 포트 점유 확인
```bash
# 어떤 프로세스가 포트를 사용하는지 확인
netstat -ano | findstr :32577
netstat -ano | findstr :3000

# 작업 관리자에서 PID로 프로세스 찾기
작업 관리자 → 세부 정보 탭 → PID 열 확인
```

---

## ✅ 최종 권장 순서

```bash
1️⃣  stop.bat 실행 (기존 서버 종료)
2️⃣  restart.bat 실행 (서버 재시작)
3️⃣  브라우저에서 Ctrl + Shift + R (강제 새로고침)
```

이 3단계만 하면 99% 해결됩니다! 🎉

---

**문제가 계속되면 에러 메시지를 공유해주세요!** 🚀

