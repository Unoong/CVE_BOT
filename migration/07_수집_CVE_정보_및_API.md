# 07. 수집 모듈 - CVE 정보 및 CVE API

## 역할

- CVE 코드별로 상세 정보를 조회해 `CVE_Info`를 채우거나 보강.

## cve_info_collector.py

- **API**: `https://cve.circl.lu/api/cve/{cve_code}`
- **함수**:
  - `get_cve_info(cve_code)`: API 호출 후 파싱해 dict 반환.
  - `parse_cve_data(data, cve_code)`: 응답에서 state, dates, product, descriptions, effect_version, cweId, Attak_Type, CVSS_Score, CVSS_Vertor, CVSS_Serverity, solutions 등 추출.
- **저장**: 호출 측(main 또는 별도 스크립트)에서 `db_manager.insert_cve_info(conn, cve_info)` 사용.
- **번역**: `translator.translate_to_korean` 등으로 설명/해결방안 번역 후 DB 저장 가능.

## cve_api_collector.py

- 통합 CVE 수집·카카오톡 전송 등 더 큰 스크립트 내에서 CVE API 호출용으로 사용되는 코드.
- requests로 CVE API 호출, MySQL에 적재, (선택) 카카오톡 전송 로직 포함 가능.
- 마이그레이션 시: 실제 사용되는 엔드포인트·DB 테이블·환경 변수 확인 후 동일하게 맞추기.

## CVE_Info 테이블 보강

- `Github_CVE_Info`의 `cve_info_status='N'`인 CVE에 대해:
  - `cve_info_collector.get_cve_info(cve_code)` 호출.
  - 결과를 `CVE_Info`에 삽입/갱신 후 `cve_info_status`를 'Y'로 업데이트(`update_cve_info_status` 등).

## update_cve_info_status.py

- CVE 정보 수집 상태를 일괄 업데이트하는 유틸. 필요 시 `cve_info_status` 플래그 정리용으로 사용.
