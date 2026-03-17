# 12. 웹 CVE 목록·상세

## CVE 목록

- **페이지**: `client/src/pages/CVEList.jsx`
- **API**: **GET /api/cve/list**
  - 쿼리: page, limit, sort, order, search(cve_code/keyword), severity, dateFrom, dateTo 등(서버 구현에 따름).
  - 응답: CVE 목록, 전체 개수(페이지네이션용).

## CVE 상세

- **페이지**: `client/src/pages/CVEDetail.jsx`
- **API**: **GET /api/cve/:cve_code**
  - 응답: 해당 CVE의 CVE_Info 기반 상세(코드, 상태, 날짜, 제품, 설명, CVSS, 해결방안, 연관 POC 수 등).

## 세부 기능

- 목록: 테이블/카드 형태, 정렬(날짜, CVSS, CVE 코드 등), 검색, 위험도 필터.
- 상세: CVE 메타, 설명, CVSS 벡터, 해결방안, 해당 CVE POC 목록 링크.
- 링크: CVE 상세에서 POC 목록으로 이동 시 쿼리 파라미터로 cve_code 전달 가능.
