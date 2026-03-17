-- Gemini 에러 메시지 필드 확대
-- error_message를 TEXT → MEDIUMTEXT로 변경하여 더 긴 에러 스택 저장

USE cve_bot_db;

-- gemini_quota_events 테이블의 error_message 컬럼 확대
ALTER TABLE gemini_quota_events 
MODIFY COLUMN error_message MEDIUMTEXT COMMENT '상세 오류 메시지 (스택 트레이스 포함)';

SELECT 'gemini_quota_events.error_message 컬럼을 MEDIUMTEXT로 확대 완료!' as result;

