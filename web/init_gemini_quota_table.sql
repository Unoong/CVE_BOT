-- Gemini 계정 할당량 추적 테이블

-- 1. Gemini 계정 정보 테이블
CREATE TABLE IF NOT EXISTS gemini_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_name VARCHAR(100) UNIQUE NOT NULL COMMENT '계정 이름 (예: .gemini_gpt8354)',
    account_email VARCHAR(255) COMMENT '계정 이메일',
    folder_path VARCHAR(500) NOT NULL COMMENT '계정 폴더 경로',
    is_active BOOLEAN DEFAULT TRUE COMMENT '활성 상태',
    display_order INT DEFAULT 0 COMMENT '사용 순서',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_active (is_active),
    INDEX idx_order (display_order)
) COMMENT 'Gemini 계정 정보';

-- 2. 일일 할당량 사용 현황 테이블
CREATE TABLE IF NOT EXISTS gemini_quota_usage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_id INT NOT NULL COMMENT 'gemini_accounts.id',
    usage_date DATE NOT NULL COMMENT '사용 날짜',
    request_count INT DEFAULT 0 COMMENT '요청 횟수',
    success_count INT DEFAULT 0 COMMENT '성공 횟수',
    failed_count INT DEFAULT 0 COMMENT '실패 횟수',
    quota_exceeded_at TIMESTAMP NULL COMMENT '할당량 초과 시각',
    is_quota_exceeded BOOLEAN DEFAULT FALSE COMMENT '할당량 초과 여부',
    last_used_at TIMESTAMP NULL COMMENT '마지막 사용 시각',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_account_date (account_id, usage_date),
    FOREIGN KEY (account_id) REFERENCES gemini_accounts(id) ON DELETE CASCADE,
    INDEX idx_date (usage_date),
    INDEX idx_quota_exceeded (is_quota_exceeded)
) COMMENT 'Gemini 일일 할당량 사용 현황';

-- 3. 할당량 사용 이벤트 로그 (상세)
CREATE TABLE IF NOT EXISTS gemini_quota_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_id INT NOT NULL COMMENT 'gemini_accounts.id',
    event_type ENUM('success', 'failed', 'quota_exceeded', 'rate_limit', 'account_switched') NOT NULL COMMENT '이벤트 타입',
    cve_code VARCHAR(50) COMMENT '처리한 CVE 코드',
    poc_link TEXT COMMENT 'POC 링크',
    error_message TEXT COMMENT '오류 메시지',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES gemini_accounts(id) ON DELETE CASCADE,
    INDEX idx_account_date (account_id, created_at),
    INDEX idx_event_type (event_type)
) COMMENT 'Gemini 할당량 이벤트 로그';

-- 초기 계정 데이터 삽입
INSERT INTO gemini_accounts (account_name, account_email, folder_path, display_order) VALUES
('.gemini_gpt8354', 'gpt8354@gmail.com', 'E:\\LLama\\pythonProject\\CVE_BOT\\gemini_account\\.gemini_gpt8354', 1),
('.gemini_imjong1111', 'imjong1111@gmail.com', 'E:\\LLama\\pythonProject\\CVE_BOT\\gemini_account\\.gemini_imjong1111', 2),
('.gemini_lim902931', 'lim902931@gmail.com', 'E:\\LLama\\pythonProject\\CVE_BOT\\gemini_account\\.gemini_lim902931', 3),
('.gemini_now', 'now@gmail.com', 'E:\\LLama\\pythonProject\\CVE_BOT\\gemini_account\\.gemini_now', 4),
('.gemini_shinhands_gpt', 'shinhands_gpt@gmail.com', 'E:\\LLama\\pythonProject\\CVE_BOT\\gemini_account\\.gemini_shinhands_gpt', 5)
ON DUPLICATE KEY UPDATE 
    folder_path = VALUES(folder_path),
    display_order = VALUES(display_order);

