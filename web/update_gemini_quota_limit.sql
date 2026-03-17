-- Gemini 계정별 일일 할당량 한도 설정
-- now 계정: 2000, 나머지: 1000

-- 1. gemini_accounts 테이블에 daily_quota_limit 컬럼 추가 (MySQL은 IF NOT EXISTS 미지원)
-- 이미 존재하면 오류 발생하므로 주의
ALTER TABLE gemini_accounts 
ADD COLUMN daily_quota_limit INT DEFAULT 1000 COMMENT '일일 할당량 한도';

-- 2. 계정별 한도 설정
UPDATE gemini_accounts SET daily_quota_limit = 1000 WHERE account_name = '.gemini_gpt8354';
UPDATE gemini_accounts SET daily_quota_limit = 1000 WHERE account_name = '.gemini_imjong1111';
UPDATE gemini_accounts SET daily_quota_limit = 1000 WHERE account_name = '.gemini_lim902931';
UPDATE gemini_accounts SET daily_quota_limit = 2000 WHERE account_name = '.gemini_now';
UPDATE gemini_accounts SET daily_quota_limit = 1000 WHERE account_name = '.gemini_shinhands_gpt';

-- 3. 확인
SELECT account_name, account_email, daily_quota_limit, is_active, display_order 
FROM gemini_accounts 
ORDER BY display_order;

