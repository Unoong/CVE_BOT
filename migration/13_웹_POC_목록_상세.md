# 13. 웹 POC 목록·상세

## POC 목록

- CVE 목록/상세 또는 전용 POC 목록 페이지에서 조회. **GET /api/cve/list** 또는 통합 데이터 기반 목록 API에서 POC(링크/다운로드경로) 정보 포함.
- 필터: CVE 코드, AI 분석 여부, 날짜 등.

## POC 상세

- **페이지**: `client/src/pages/POCDetail.jsx`
- **API**:
  - **GET /api/poc/:id**: POC 한 건 상세(Github_CVE_Info + CVE_Info + CVE_Packet_AI_Analysis 단계별).
  - **GET /api/poc/:id/rating**: 평점/추천 정보.
  - **POST /api/poc/:id/rating**: 평점 등록(인증 필요).
  - **DELETE /api/poc/:id/rating**: 평점 삭제(인증 필요).
  - **GET /api/poc/:id/comments**: 댓글 목록.
  - **POST /api/poc/:id/comments**: 댓글 작성(인증).
  - **PUT /api/poc/:id/comments/:commentId**: 댓글 수정(본인/관리자).
  - **DELETE /api/poc/:id/comments/:commentId**: 댓글 삭제(본인/관리자).
  - **GET /api/poc/:id/reanalyze-history**: 재분석 이력.
  - **POST /api/poc/:id/reanalyze**: 재분석 실행(관리자만).

## 세부 기능

- 상세 화면: README, 번역문, AI 분석 단계별 패킷/단계명/설명/예상 응답/MITRE Tactic·Technique/Snort 룰/대응 방안.
- MITRE 매트릭스: `MitreDialog.jsx` 등으로 Tactic·Technique 표시.
- 재분석: 관리자가 동일 POC에 대해 AI 분석 다시 실행 후 결과 갱신.
- 평점/댓글: 로그인 사용자만 작성·수정·삭제.
