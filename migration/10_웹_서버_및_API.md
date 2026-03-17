# 10. 웹 서버 및 API

## 서버 구성

- **파일**: `web/server.js` (Express)
- **HTTP 포트**: 32577 (0.0.0.0)
- **HTTPS 포트**: 32578 (0.0.0.0, server.cert/server.key 있을 때)
- **SSL**: server.cert, server.key (자체 서명 또는 Let's Encrypt). 없으면 HTTP만 사용.

## 미들웨어

- cors, express.json(50mb), express.urlencoded, `/uploads` 정적, dotenv(.env), 세션(express-session), Socket.IO(https 우선).

## 인증

- **JWT**: `authenticateToken` — Authorization: Bearer \<token\>
- **역할**: `checkRole(['admin'])`, `checkRole(['analyst','admin'])` 등.
- **API 토큰**: `authenticateApiToken` — X-API-Token 헤더. Export API용.

## API 목록 (엔드포인트만 요약)

| 구분 | 메서드 | 경로 | 인증/역할 |
|------|--------|------|------------|
| 인증 | POST | /api/auth/send-verification | - |
| | POST | /api/auth/verify-code | - |
| | POST | /api/auth/register | - |
| | POST | /api/auth/login | - |
| | GET | /api/auth/me | Token |
| | POST | /api/auth/find-id | - |
| | POST | /api/auth/reset-password-send-code | - |
| | POST | /api/auth/reset-password-verify-code | - |
| | POST | /api/auth/reset-password | - |
| CVE | GET | /api/cve/list | - |
| | GET | /api/cve/:cve_code | - |
| 대시보드 | GET | /api/dashboard/stats | - |
| | GET | /api/dashboard/collection-trends | - |
| | GET | /api/dashboard/detailed-stats | - |
| | POST | /api/dashboard/filter-cves | - |
| POC | GET | /api/poc/:id | - |
| | POST | /api/poc/:id/reanalyze | Token, admin |
| | GET/POST/DELETE | /api/poc/:id/rating | GET 공개, POST/DELETE Token |
| | GET/POST/PUT/DELETE | /api/poc/:id/comments | GET 공개, 나머지 Token |
| | GET | /api/poc/:id/reanalyze-history | - |
| 게시판 | GET | /api/board/posts | - |
| | GET | /api/board/posts/:id | - |
| | POST/PUT/DELETE | /api/board/posts, /:id | Token |
| DB 쿼리 | POST | /api/db/query | Token, analyst/admin |
| 관리자 | GET | /api/admin/logs | Token, admin |
| | GET | /api/admin/users | Token, admin |
| | PUT | /api/admin/users/:id/role, /reset-password, /nickname | Token, admin |
| | DELETE | /api/admin/users/:id | Token, admin |
| | GET/PUT | /api/admin/cve-limits | Token, admin |
| | GET/PUT | /api/admin/system-config/collection, ai-analysis, default-role | Token, admin |
| | POST/GET/DELETE/PATCH | /api/admin/tokens, /:id, /:id/status | Token, admin |
| 프로필 | GET | /api/users/profile | Token |
| | PUT | /api/users/profile/nickname, /password | Token |
| MITRE | GET | /api/mitre/:techniqueId | - |
| | GET | /api/mitre/tactic/:tacticId | - |
| | GET | /api/mitre/search/stage/:stageName | - |
| Export | GET | /api/export/cve | API Token |
| | POST | /api/export/cve/confirm | API Token |
| | GET | /api/export/cve/:cveCode | API Token |
| Gemini | GET | /api/gemini/quota/today, /history, /events | Token, admin |
| 채팅 | POST | /api/chat/upload-image | Token |

- Socket.IO: 실시간 채팅 메시지 송수신.
