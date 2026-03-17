-- Gemini 계정 설정 (3개 계정)
-- 실행: mysql -h localhost -P 7002 -u root -p TOTORO < setup_gemini_accounts.sql

-- 기존 계정 정리 (선택)
-- DELETE FROM gemini_quota_usage;
-- DELETE FROM gemini_quota_events;
-- DELETE FROM gemini_accounts;

INSERT INTO gemini_accounts (account_name, account_email, folder_path, display_order) VALUES
('.gemini_shinhands.gpt', 'shinhands.gpt@gmail.com', 'C:\\aiserver\\CVE_BOT\\gemini_account\\.gemini_shinhands.gpt', 1),
('.gemini_shinhands.gemini', 'shinhands.gemini@gmail.com', 'C:\\aiserver\\CVE_BOT\\gemini_account\\.gemini_shinhands.gemini', 2),
('.gemini_shinhands.credit1', 'shinhands.credit1@gmail.com', 'C:\\aiserver\\CVE_BOT\\gemini_account\\.gemini_shinhands.credit1', 3)
ON DUPLICATE KEY UPDATE 
    account_email = VALUES(account_email),
    folder_path = VALUES(folder_path),
    display_order = VALUES(display_order);
