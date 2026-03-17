# 🔒 HTTPS 설정 가이드

## ✅ 현재 상태: 자체 서명 인증서

### 📋 생성된 파일
```
web/
├── server.key   (1.7KB) - 개인키
└── server.cert  (1.3KB) - SSL 인증서 (1년 유효)
```

---

## 🚀 서버 실행

### 서버 시작
```bash
cd E:\LLama\pythonProject\CVE_BOT\web
run.bat
```

### 접속 주소
- **HTTP**: `http://localhost:32577` (기존)
- **HTTPS**: `https://localhost:32578` (신규) 🔒

---

## 🌐 외부 접속 (공인 IP 있는 경우)

서버 시작 시 자동으로 표시됩니다:
```
📡 HTTP 서버:
   📍 로컬: http://localhost:32577
   📍 외부: http://192.168.0.100:32577

🔒 HTTPS 서버:
   📍 로컬: https://localhost:32578
   📍 외부: https://192.168.0.100:32578
```

---

## ⚠️ 브라우저 경고 무시 방법

자체 서명 인증서는 브라우저에서 "안전하지 않음" 경고를 표시합니다. 이는 정상이며, 다음과 같이 진행하세요:

### Chrome/Edge
1. `https://localhost:32578` 접속
2. "주의 필요" 페이지 표시
3. **"고급"** 클릭
4. **"localhost(으)로 이동"** 클릭

### Firefox
1. `https://localhost:32578` 접속
2. "경고: 잠재적 보안 위험이 있습니다" 페이지
3. **"고급"** 클릭
4. **"위험을 감수하고 계속"** 클릭

---

## 🔐 API 토큰 사용 (HTTPS)

### Python 예제
```python
import requests

# SSL 인증 무시 (자체 서명 인증서)
API_URL = 'https://localhost:32578/api'
API_TOKEN = 'your_token_here'

response = requests.get(
    f'{API_URL}/cve/export',
    headers={'X-API-Token': API_TOKEN},
    verify=False  # ← 자체 서명 인증서는 verify=False 필요
)

# SSL 경고 비활성화
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

data = response.json()
print(f"✅ {data['pagination']['total']}개 CVE 수집 완료")
```

### cURL 예제
```bash
# -k 옵션으로 SSL 인증 무시
curl -k -H "X-API-Token: your_token" \
     https://localhost:32578/api/cve/export
```

---

## 🌍 Let's Encrypt로 전환 (도메인 준비 시)

### 1. 도메인 구입 및 DNS 설정
```
yourdomain.com → 서버 공인 IP
```

### 2. Certbot 설치 (Windows)
```bash
# Winget 사용
winget install certbot

# 또는 Chocolatey
choco install certbot
```

### 3. 인증서 발급
```bash
# 80번 포트가 열려있어야 함
certbot certonly --standalone -d yourdomain.com

# 발급 완료 시 경로:
# C:\Certbot\live\yourdomain.com\privkey.pem
# C:\Certbot\live\yourdomain.com\fullchain.pem
```

### 4. server.js 수정
```javascript
// 21-27줄 수정
let httpsOptions = null;
try {
    // Let's Encrypt 인증서로 변경
    httpsOptions = {
        key: fssync.readFileSync('C:\\Certbot\\live\\yourdomain.com\\privkey.pem'),
        cert: fssync.readFileSync('C:\\Certbot\\live\\yourdomain.com\\fullchain.pem')
    };
    console.log('✅ Let\'s Encrypt 인증서 로드 완료');
} catch (err) {
    console.log('⚠️  SSL 인증서 없음 - HTTP만 사용');
}
```

### 5. 자동 갱신 설정 (Let's Encrypt는 90일마다 갱신)
```bash
# Windows 작업 스케줄러에 등록
certbot renew --dry-run  # 테스트
certbot renew            # 실제 갱신
```

### 6. 서버 재시작
```bash
# 서버 중지 후 재시작
run.bat
```

---

## 📊 인증서 비교

| 항목 | 자체 서명 | Let's Encrypt |
|------|----------|---------------|
| 비용 | 무료 | 무료 |
| 브라우저 경고 | ⚠️ 있음 | ✅ 없음 |
| 도메인 필요 | ❌ 불필요 | ✅ 필수 |
| 유효기간 | 1년 (수동 갱신) | 90일 (자동 갱신) |
| 용도 | 개발/내부망 | 운영/공개 서비스 |

---

## 🔧 문제 해결

### 1. "SSL 인증서 로드 실패"
```bash
# 인증서 파일 확인
cd E:\LLama\pythonProject\CVE_BOT\web
dir server.key server.cert

# 없으면 재생성
openssl req -nodes -new -x509 -keyout server.key -out server.cert -days 365 ^
  -subj "/C=KR/ST=Seoul/L=Seoul/O=CVE Bot/OU=Security/CN=localhost"
```

### 2. "포트 이미 사용 중"
```bash
# 32578 포트 사용 프로세스 확인
netstat -ano | findstr :32578

# 프로세스 종료
taskkill /PID [프로세스ID] /F
```

### 3. "방화벽 차단"
```
Windows 방화벽 → 고급 설정 → 인바운드 규칙
→ 새 규칙 → 포트 → TCP 32578 → 허용
```

---

## 📝 인증서 갱신 (자체 서명)

### 1년 후 만료 시:
```bash
cd E:\LLama\pythonProject\CVE_BOT\web

# 기존 인증서 백업
move server.key server.key.old
move server.cert server.cert.old

# 새 인증서 생성
openssl req -nodes -new -x509 -keyout server.key -out server.cert -days 365 ^
  -subj "/C=KR/ST=Seoul/L=Seoul/O=CVE Bot/OU=Security/CN=localhost"

# 서버 재시작
```

---

## 🎯 권장 사용 시나리오

### 현재 (자체 서명):
```
✅ 로컬 개발
✅ 내부망 서비스
✅ 테스트 환경
✅ API 토큰 테스트
```

### Let's Encrypt 전환 시:
```
✅ 공개 웹사이트
✅ 외부 API 제공
✅ 클라이언트 배포
✅ 브라우저 경고 없는 HTTPS
```

---

## 🔗 관련 문서

- **외부 접속 설정**: `EXTERNAL_ACCESS_GUIDE.md`
- **API 토큰 관리**: `API_TOKEN_FEATURE.md`
- **서버 설정**: `server.js`

---

## 📞 추가 도움말

**현재 상태:**
- ✅ HTTP: 32577 포트
- ✅ HTTPS: 32578 포트 (자체 서명)
- ✅ API 토큰 인증 지원
- ✅ Socket.IO (HTTPS 우선)

**다음 단계:**
- 🔜 도메인 구입 후 Let's Encrypt 전환
- 🔜 외부 API 테스트
- 🔜 프로덕션 배포

---

**끝!** 🎉

현재 자체 서명 인증서로 HTTPS가 활성화되었습니다.  
나중에 도메인 준비되면 Let's Encrypt로 쉽게 전환할 수 있습니다!

