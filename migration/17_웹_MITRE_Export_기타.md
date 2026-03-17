# 17. 웹 MITRE·Export·기타

## MITRE ATT&CK

- **API**:
  - **GET /api/mitre/:techniqueId**: Technique ID별 상세(이름, 설명 등).
  - **GET /api/mitre/tactic/:tacticId**: Tactic ID별 상세.
  - **GET /api/mitre/search/stage/:stageName**: 단계명(또는 tactic/technique 이름) 검색.
- **데이터**: `web/mitre_attack_matrix.csv` (또는 서버에서 로드하는 CSV/DB).
- **프론트**: POC 상세에서 MITRE Tactic·Technique 표시, MitreDialog.jsx.

## CVE Export API (외부 연동)

- **인증**: **X-API-Token** 헤더. DB의 api_tokens와 매칭, permissions(read/write) 확인.
- **GET /api/export/cve**: 페이지네이션으로 CVE 목록 반환(query: page, limit). 읽기 권한 필요.
- **POST /api/export/cve/confirm**: 전송 확인(링크 목록 등). status 업데이트. 쓰기 권한 필요.
- **GET /api/export/cve/:cveCode**: CVE 코드별 상세 내보내기.
- 로깅: logger로 호출/토큰/결과 기록.

## Gemini 할당량

- **GET /api/gemini/quota/today**: 오늘 사용량/제한.
- **GET /api/gemini/quota/history**: 기간별 이력.
- **GET /api/gemini/quota/events**: 할당량 이벤트(계정 전환 등).
- **페이지**: GeminiQuota.jsx (관리자만).
- **DB**: gemini_quota_events 등 테이블 사용.

## 도움말

- **페이지**: Help.jsx. 사용 방법, FAQ, 링크 등 정적/동적 내용.
