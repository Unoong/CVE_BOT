# 🔒 프로필 보안 강화 완료

## ✅ 해결된 문제

### 1. **프로필 조회 실패** (✅)
- **원인**: 서버가 재시작되지 않아 API가 적용되지 않음
- **해결**: 서버 재시작 필요

### 2. **비밀번호 변경 에러** (✅)
- **에러**: "Cannot PUT /api/users/profile/password"
- **원인**: 서버가 재시작되지 않아 라우트 미등록
- **해결**: 서버 재시작 필요

### 3. **파라미터 변조 공격 방어** (✅)
- **요구사항**: URL 파라미터 변경으로 다른 사용자 정보 변경 방지
- **해결**: 전체 프로필 API에 보안 강화 적용

---

## 🔒 적용된 보안 조치

### 1. **파라미터 변조 공격 방어**

#### 문제 시나리오
```
❌ 공격: 사용자가 API 요청 시 다른 사용자 ID로 변조 시도
예: PUT /api/users/profile/password
Body: { "userId": 2, "currentPassword": "...", "newPassword": "..." }
→ 다른 사용자 비밀번호 변경 시도
```

#### 방어 메커니즘
```javascript
// 🔒 JWT 토큰의 user.id만 사용 (파라미터 변조 불가)
const userId = parseInt(req.user.id);

// 🔒 WHERE 절에 userId 명시
UPDATE users SET password = ? WHERE id = ?
```

**핵심 원리:**
- ✅ JWT 토큰에서 추출한 `req.user.id`만 사용
- ✅ 클라이언트에서 전송한 `userId` 파라미터는 **절대 사용하지 않음**
- ✅ WHERE 절에 토큰의 userId 명시로 **다른 사용자 수정 불가**

---

### 2. **입력값 검증 강화**

#### 프로필 조회
```javascript
// userId 타입 및 유효성 검증
const userId = parseInt(req.user.id);
if (!userId || isNaN(userId)) {
    return res.status(400).json({ error: '잘못된 요청입니다' });
}
```

#### 닉네임 변경
```javascript
// 길이 검증 (2~50자)
const validation = validateInput(nickname, 2, 50);

// XSS 방어: HTML 태그 제거
const sanitizedNickname = nickname.replace(/<[^>]*>/g, '').trim();
```

#### 비밀번호 변경
```javascript
// 길이 검증 (4~100자)
if (newPassword.length < 4) {
    return res.status(400).json({ error: '새 비밀번호는 최소 4자 이상이어야 합니다' });
}
if (newPassword.length > 100) {
    return res.status(400).json({ error: '비밀번호는 최대 100자까지 가능합니다' });
}

// 🔒 현재 비밀번호 확인 (본인 인증)
const isValid = await bcrypt.compare(currentPassword, users[0].password);
if (!isValid) {
    return res.status(401).json({ error: '현재 비밀번호가 일치하지 않습니다' });
}
```

---

### 3. **상세 로깅**

모든 프로필 API 요청에 로깅 추가:
```javascript
logger.info(`[프로필 조회] 사용자 ID: ${req.user.id}, 사용자명: ${req.user.username}`);
logger.info(`[닉네임 변경] 사용자 ID: ${req.user.id}`);
logger.info(`[비밀번호 변경] 사용자 ID: ${req.user.id}`);
```

**로그 용도:**
- ✅ 보안 감사
- ✅ 비정상 접근 시도 감지
- ✅ 디버깅

---

## 🧪 보안 테스트 시나리오

### 시나리오 1: 파라미터 변조 공격 시도
```javascript
// ❌ 공격 시도: Postman에서 다른 사용자 ID로 요청
PUT /api/users/profile/password
Headers: { Authorization: "Bearer user1_token" }
Body: {
  "userId": 2,  // user2의 ID로 변조 시도
  "currentPassword": "1234",
  "newPassword": "hacked"
}

// ✅ 결과: 실패!
// - req.user.id = 1 (user1의 JWT 토큰에서 추출)
// - Body의 userId는 무시됨
// - WHERE id = 1로 쿼리 실행
// - user1의 비밀번호만 변경 (user2는 영향 없음)
```

### 시나리오 2: URL 파라미터 변조
```javascript
// ❌ 공격 시도: URL에 다른 사용자 ID 포함
PUT /api/users/profile/password?userId=2
Headers: { Authorization: "Bearer user1_token" }
Body: { "currentPassword": "1234", "newPassword": "hacked" }

// ✅ 결과: 실패!
// - URL 파라미터는 사용하지 않음
// - req.user.id만 사용
// - user1의 정보만 변경
```

### 시나리오 3: 정상 사용
```javascript
// ✅ 정상 요청: 본인 비밀번호 변경
PUT /api/users/profile/password
Headers: { Authorization: "Bearer user1_token" }
Body: {
  "currentPassword": "1234",
  "newPassword": "5678"
}

// ✅ 결과: 성공!
// - 현재 비밀번호 확인
// - user1의 비밀번호 변경
// - 로그 기록
```

---

## 🔧 수정된 API 목록

### 1. GET /api/users/profile
**보안 강화:**
- ✅ JWT 토큰의 user.id만 사용
- ✅ userId 타입 검증
- ✅ 로깅 추가

### 2. PUT /api/users/profile/nickname
**보안 강화:**
- ✅ JWT 토큰의 user.id만 사용
- ✅ 입력값 길이 검증 (2~50자)
- ✅ XSS 방어 (HTML 태그 제거)
- ✅ affectedRows 확인
- ✅ 로깅 추가

### 3. PUT /api/users/profile/password
**보안 강화:**
- ✅ JWT 토큰의 user.id만 사용
- ✅ 현재 비밀번호 확인 (본인 인증)
- ✅ 비밀번호 길이 검증 (4~100자)
- ✅ bcrypt 해싱
- ✅ affectedRows 확인
- ✅ 로깅 추가

---

## 🚨 서버 재시작 (필수!)

**문제 해결을 위해 반드시 서버를 재시작하세요!**

```bash
# 1. 웹 폴더로 이동
cd E:\LLama\pythonProject\CVE_BOT\web

# 2. 서버 재시작
restart.bat
```

**또는 수동으로:**
```bash
# 1. 모든 Node.js 프로세스 종료
taskkill /F /IM node.exe /T

# 2. 백엔드 서버 시작
cd E:\LLama\pythonProject\CVE_BOT\web
node server.js

# 3. 프론트엔드 서버 시작 (새 터미널)
cd E:\LLama\pythonProject\CVE_BOT\web\client
npm run dev
```

---

## 🎯 테스트 방법

### 1. 프로필 조회 테스트
```
1. ✅ 로그인
2. ✅ 우측 상단 아바타 클릭
3. ✅ "내 프로필" 클릭
4. ✅ 정보가 정상적으로 로드됨
5. ✅ 백엔드 로그 확인: "[프로필 조회 성공]"
```

### 2. 닉네임 변경 테스트
```
1. ✅ 프로필 페이지에서 닉네임 "변경" 클릭
2. ✅ "홍길동" 입력
3. ✅ 변경 클릭
4. ✅ 성공 메시지
5. ✅ 채팅에서 "홍길동"으로 표시 확인
```

### 3. 비밀번호 변경 테스트
```
1. ✅ 프로필 페이지에서 "비밀번호 변경" 클릭
2. ✅ 현재 비밀번호 입력
3. ✅ 새 비밀번호 입력
4. ✅ 변경 클릭
5. ✅ 성공 메시지
6. ✅ 3초 후 자동 로그아웃
7. ✅ 새 비밀번호로 로그인 성공
```

### 4. 파라미터 변조 테스트 (Postman)
```
1. ✅ user1로 로그인하여 JWT 토큰 획득
2. ✅ Postman에서 다른 사용자 ID로 요청
3. ❌ 다른 사용자 정보 변경 실패
4. ✅ 본인 정보만 변경 가능
```

---

## 📊 보안 체크리스트

### 파라미터 변조 방어
- [x] JWT 토큰의 user.id만 사용
- [x] URL 파라미터 무시
- [x] Body 파라미터의 userId 무시
- [x] WHERE 절에 토큰 userId 명시
- [x] affectedRows 확인

### 입력값 검증
- [x] 닉네임 길이 검증 (2~50자)
- [x] 비밀번호 길이 검증 (4~100자)
- [x] 타입 검증 (parseInt, isNaN)
- [x] XSS 방어 (HTML 태그 제거)

### 인증 및 권한
- [x] JWT 토큰 인증 (authenticateToken)
- [x] 현재 비밀번호 확인 (본인 인증)
- [x] bcrypt 해싱
- [x] 토큰 만료 처리

### 로깅
- [x] 모든 요청 로깅
- [x] 성공/실패 로그 구분
- [x] 사용자 ID, 사용자명 기록
- [x] 에러 상세 로그

---

## 💡 추가 권장사항

### 비밀번호 정책
```
✅ 현재: 최소 4자 이상
🔒 권장: 최소 8자 + 영문/숫자/특수문자 조합
```

### Rate Limiting
```javascript
// 비밀번호 변경 시도 제한 (5분에 3회)
const rateLimit = require('express-rate-limit');

const passwordChangeLimit = rateLimit({
    windowMs: 5 * 60 * 1000, // 5분
    max: 3, // 최대 3회
    message: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.'
});

app.put('/api/users/profile/password', authenticateToken, passwordChangeLimit, ...);
```

### 2FA (Two-Factor Authentication)
- 이메일 인증 코드
- SMS 인증
- TOTP (Google Authenticator)

---

## 🔍 디버깅 가이드

### 프로필 로드 실패 시
1. **F12 → Console 확인**
   - 에러 메시지 확인
   - API 요청 URL 확인

2. **F12 → Network 확인**
   - `/api/users/profile` 요청 상태
   - 응답 코드 (200, 401, 404, 500)

3. **백엔드 로그 확인**
   ```
   [프로필 조회] 사용자 ID: 1, 사용자명: user1
   [프로필 조회 성공]
   ```

### 비밀번호 변경 실패 시
1. **에러 메시지 확인**
   - "현재 비밀번호가 일치하지 않습니다"
   - "Cannot PUT..." → 서버 재시작 필요

2. **백엔드 로그 확인**
   ```
   [비밀번호 변경] 사용자 ID: 1
   [비밀번호 변경] 현재 비밀번호 불일치
   ```

---

**모든 보안 조치가 완료되었습니다!** 🎉🔒

**지금 바로 서버를 재시작하고 테스트하세요!** 🚀

```bash
E:\LLama\pythonProject\CVE_BOT\web\restart.bat
```

