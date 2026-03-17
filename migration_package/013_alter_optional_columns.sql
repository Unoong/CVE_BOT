-- ================================================================================
-- 013: 기존 DB에 컬럼 추가 (이미 있으면 에러 무시 - 수동 적용 시 참고)
-- ================================================================================
-- 새 설치 시 002~006에서 이미 반영되어 있으면 불필요합니다.
-- 기존 DB를 마이그레이션할 때만 순서대로 실행하세요.

-- Github_CVE_Info.cve_info_status (없을 때만)
-- ALTER TABLE Github_CVE_Info ADD COLUMN cve_info_status VARCHAR(10) DEFAULT 'N';

-- CVE_Packet_AI_Analysis (없을 때만)
-- ALTER TABLE CVE_Packet_AI_Analysis ADD COLUMN expected_response LONGTEXT;
-- ALTER TABLE CVE_Packet_AI_Analysis ADD COLUMN affected_products JSON;

-- users (없을 때만)
-- ALTER TABLE users ADD COLUMN nickname VARCHAR(50);
-- ALTER TABLE users ADD COLUMN last_login TIMESTAMP NULL COMMENT '마지막 로그인 시간';

-- 실행 예: MySQL에서 컬럼 존재 여부 확인 후 수동 실행
-- SELECT COLUMN_NAME FROM information_schema.COLUMNS
--   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Github_CVE_Info' AND COLUMN_NAME = 'cve_info_status';
