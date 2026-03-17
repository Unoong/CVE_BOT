# 🔒 SSL 인증서 설정 가이드

## 도메인: www.ai-platform.store

---

## 📋 1단계: 사전 준비

### 1.1 DNS 설정 확인
도메인 관리 페이지에서 다음 레코드를 추가하세요:

```
타입: A
호스트: www
값: [서버 공인 IP 주소]
TTL: 자동 또는 3600

타입: A  
호스트: @ (또는 ai-platform.store)
값: [서버 공인 IP 주소]
TTL: 자동 또는 3600
```

### 1.2 방화벽 포트 열기

**Windows 방화벽:**
```powershell
# HTTP (Certbot 인증용)
New-NetFirewallRule -DisplayName "HTTP Port 80" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow

# HTTPS
New-NetFirewallRule -DisplayName "HTTPS Port 443" -Direction Inbound -LocalPort 443 -Protocol TCP -Action Allow

# 애플리케이션 포트
New-NetFirewallRule -DisplayName "CVE Bot HTTP" -Direction Inbound -LocalPort 32577 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "CVE Bot HTTPS" -Direction Inbound -LocalPort 32578 -Protocol TCP -Action Allow
```

**공유기/방화벽:**
- 80 → 서버 80 포트 포워딩
- 443 → 서버 443 포트 포워딩
- 32577 → 서버 32577 포트 포워딩
- 32578 → 서버 32578 포트 포워딩

---

## 🔧 2단계: Certbot 설치

### 방법 1: 공식 설치 프로그램 (권장)

1. https://github.com/certbot/certbot/releases 방문
2. `certbot-beta-installer-win_amd64_signed.exe` 다운로드
3. 관리자 권한으로 실행
4. 설치 완료

### 방법 2: Chocolatey 사용

```powershell
# Chocolatey 설치 (없는 경우)
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Certbot 설치
choco install certbot -y
```

---

## 📜 3단계: SSL 인증서 발급

### 방법 1: Standalone 모드 (서버 중지 필요)

```bash
# 웹 서버를 먼저 중지하세요
certbot certonly --standalone -d www.ai-platform.store -d ai-platform.store
```

### 방법 2: Webroot 모드 (서버 실행 중)

```bash
certbot certonly --webroot -w E:\LLama\pythonProject\CVE_BOT\web\client\build -d www.ai-platform.store -d ai-platform.store
```

### 입력 정보:
- 이메일: 만료 알림을 받을 이메일 주소
- 약관 동의: Y
- 이메일 공유: N (선택)

---

## 🔗 4단계: 인증서 적용

인증서가 발급되면 다음 위치에 저장됩니다:

```
C:\Certbot\live\www.ai-platform.store\privkey.pem   (개인키)
C:\Certbot\live\www.ai-platform.store\fullchain.pem (인증서 체인)
```

### 자동 적용:

```bash
cd E:\LLama\pythonProject\CVE_BOT\web
node apply_ssl.js
```

### 수동 적용:

```powershell
# 개인키 복사
Copy-Item "C:\Certbot\live\www.ai-platform.store\privkey.pem" "E:\LLama\pythonProject\CVE_BOT\web\server.key"

# 인증서 복사
Copy-Item "C:\Certbot\live\www.ai-platform.store\fullchain.pem" "E:\LLama\pythonProject\CVE_BOT\web\server.cert"
```

---

## 🚀 5단계: 서버 재시작

```bash
cd E:\LLama\pythonProject\CVE_BOT\web
node server.js
```

서버 로그에서 다음 확인:
```
✅ SSL 인증서 로드 완료
HTTP 서버 시작: http://0.0.0.0:32577
HTTPS 서버 시작: https://0.0.0.0:32578
```

---

## ✅ 6단계: 접속 테스트

### HTTPS 접속:
```
https://www.ai-platform.store:32578
```

### 인증서 확인:
브라우저 주소창의 자물쇠 아이콘 클릭
- 발급자: Let's Encrypt
- 유효기간: 90일
- 도메인: www.ai-platform.store

---

## 🔄 7단계: 자동 갱신 설정

Let's Encrypt 인증서는 **90일 후 만료**됩니다. 자동 갱신을 설정하세요.

### Windows 작업 스케줄러 사용:

1. **작업 스케줄러 열기** (Win + R → `taskschd.msc`)

2. **기본 작업 만들기**
   - 이름: `Certbot Renew SSL`
   - 설명: `Let's Encrypt 인증서 자동 갱신`

3. **트리거 설정**
   - 매월
   - 일: 1일
   - 시간: 03:00 AM

4. **작업 설정**
   - 프로그램: `certbot`
   - 인수: `renew --quiet`

5. **갱신 후 적용 스크립트**
   - 프로그램: `node`
   - 인수: `E:\LLama\pythonProject\CVE_BOT\web\apply_ssl.js`

### 수동 갱신 테스트:

```bash
# 갱신 가능한지 확인 (실제 갱신 안 함)
certbot renew --dry-run

# 강제 갱신 (만료 30일 전부터 가능)
certbot renew --force-renewal
```

---

## 📊 포트 구성

| 서비스 | 포트 | 프로토콜 | 용도 |
|--------|------|----------|------|
| Certbot 인증 | 80 | HTTP | Let's Encrypt 도메인 인증 |
| 표준 HTTPS | 443 | HTTPS | (선택) Nginx 리버스 프록시용 |
| 애플리케이션 HTTP | 32577 | HTTP | 개발/테스트용 |
| 애플리케이션 HTTPS | 32578 | HTTPS | 메인 서비스 |

---

## 🔧 Nginx 리버스 프록시 (선택사항)

표준 443 포트를 사용하려면 Nginx를 리버스 프록시로 설정:

**nginx.conf:**
```nginx
server {
    listen 443 ssl http2;
    server_name www.ai-platform.store ai-platform.store;

    ssl_certificate C:/Certbot/live/www.ai-platform.store/fullchain.pem;
    ssl_certificate_key C:/Certbot/live/www.ai-platform.store/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass https://localhost:32578;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name www.ai-platform.store ai-platform.store;
    return 301 https://$server_name$request_uri;
}
```

---

## 🐛 문제 해결

### 인증서 발급 실패

**오류:** `Connection refused`
- 방화벽에서 80 포트가 열려있는지 확인
- 다른 프로그램이 80 포트를 사용 중인지 확인: `netstat -ano | findstr :80`

**오류:** `DNS resolution failed`
- DNS 설정 확인: `nslookup www.ai-platform.store`
- DNS 전파 대기 (최대 48시간)

**오류:** `Too many requests`
- Let's Encrypt에는 도메인당 주간 발급 제한이 있습니다
- `--dry-run` 옵션으로 먼저 테스트하세요

### 서버 시작 실패

**오류:** `SSL 인증서 없음`
- server.key와 server.cert 파일이 있는지 확인
- 파일 권한 확인

**오류:** `EADDRINUSE: address already in use`
- 포트가 이미 사용 중: `netstat -ano | findstr :32578`
- 기존 프로세스 종료: `taskkill /PID [PID번호] /F`

### HTTPS 접속 불가

1. 방화벽 확인
2. 공유기 포트 포워딩 확인
3. 서버 로그 확인
4. 브라우저 캐시 삭제

---

## 📞 지원

문제가 계속되면 다음을 확인하세요:

1. **DNS 전파:** https://dnschecker.org
2. **포트 오픈:** https://www.yougetsignal.com/tools/open-ports/
3. **SSL 인증서:** https://www.ssllabs.com/ssltest/

---

## 📝 체크리스트

- [ ] DNS A 레코드 설정
- [ ] 방화벽 포트 오픈 (80, 443, 32577, 32578)
- [ ] Certbot 설치
- [ ] SSL 인증서 발급
- [ ] 인증서 파일 복사
- [ ] 서버 재시작
- [ ] HTTPS 접속 테스트
- [ ] 자동 갱신 설정
- [ ] 90일 후 갱신 알림 설정

---

**🎉 설정 완료!**

이제 https://www.ai-platform.store:32578 로 안전하게 접속할 수 있습니다!

