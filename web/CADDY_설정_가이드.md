# Caddy SSL 인증서 설정 가이드 (ds-aiplatform.com)

Caddy를 사용해 Let's Encrypt 인증서를 자동 발급하고 `https://ds-aiplatform.com:3000` 에 적용합니다.

## 1. 사전 요구사항

- [ ] **DNS 설정**: `ds-aiplatform.com` 이 이 서버의 공인 IP를 가리켜야 함
- [ ] **방화벽**: 포트 **80** (ACME 인증용), **3000** (HTTPS) 허용
- [ ] **백엔드/프론트엔드** 실행 중 (32577, 3001)

## 2. Caddy 설치 (Windows)

### 방법 A: winget (권장)

```powershell
winget install Caddy.Caddy
```

### 방법 B: 수동 다운로드

1. https://caddyserver.com/download 에서 Windows 64비트 다운로드
2. `caddy.exe` 를 `c:\aiserver\CVE_BOT\web\` 또는 PATH에 추가

### 방법 C: Chocolatey

```powershell
choco install caddy
```

## 3. Caddy 실행

### 수동 실행 (테스트용)

```powershell
cd c:\aiserver\CVE_BOT\web
caddy run --config Caddyfile
```

### Windows 서비스로 등록 (NSSM 사용)

1. NSSM 다운로드: https://nssm.cc/download
2. 관리자 CMD에서:

```cmd
nssm install Caddy "c:\path\to\caddy.exe" "run --config c:\aiserver\CVE_BOT\web\Caddyfile"
nssm set Caddy AppDirectory c:\aiserver\CVE_BOT\web
nssm start Caddy
```

## 4. 실행 순서

1. **백엔드** (Node): `pm2 start ecosystem.config.js` 또는 `서버실행.bat`
2. **프론트엔드** (Vite): 포트 3001에서 실행
3. **Caddy**: `caddy run --config Caddyfile`

## 5. 인증서 발급 확인

- 최초 실행 시 Caddy가 Let's Encrypt에 인증서 요청
- **포트 80** 이 외부에서 접근 가능해야 ACME HTTP-01 챌린지 성공
- 성공 시 인증서는 `%LocalAppData%\Caddy\` 에 저장됨

## 6. 트러블슈팅

| 증상 | 확인 사항 |
|------|-----------|
| 인증서 발급 실패 | DNS가 서버 IP를 가리키는지, 포트 80이 열려 있는지 확인 |
| 502 Bad Gateway | 백엔드(32577), 프론트엔드(3001) 실행 여부 확인 |
| 연결 거부 | 방화벽에서 3000 포트 허용 확인 |

## 7. 접속 흐름 (포트 3000 사용)

**사용자가 브라우저에서 `https://ds-aiplatform.com:3000` 접속 시:**

1. Caddy가 **포트 3000**에서 HTTPS 수신 (Let's Encrypt 인증서)
2. `/api/*`, `/uploads/*`, `/socket.io/*` → Node 백엔드(32577)로 프록시
3. 그 외 경로 → Vite 프론트엔드(3001)로 프록시

→ **취약점관리시스템은 반드시 포트 3000으로 접근** (ds-aiplatform.com:3000)

## 8. 아키텍처

```
[사용자] --HTTPS:3000--> [Caddy:3000] --HTTP--> [Vite:3001] (프론트엔드)
                              |
                              +--HTTP--> [Node:32577] (/api, /uploads, /socket.io)
```
