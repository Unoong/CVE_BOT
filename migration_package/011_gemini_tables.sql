-- ================================================================================
-- 011: Gemini 계정/할당량 테이블 (초기 데이터 없음 - 배포 후 앱에서 등록)
-- ================================================================================

CREATE TABLE IF NOT EXISTS gemini_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_name VARCHAR(100) UNIQUE NOT NULL COMMENT '계정 이름',
    account_email VARCHAR(255),
    folder_path VARCHAR(500) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_active (is_active),
    INDEX idx_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gemini_quota_usage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_id INT NOT NULL,
    usage_date DATE NOT NULL,
    request_count INT DEFAULT 0,
    success_count INT DEFAULT 0,
    failed_count INT DEFAULT 0,
    quota_exceeded_at TIMESTAMP NULL,
    is_quota_exceeded BOOLEAN DEFAULT FALSE,
    last_used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_account_date (account_id, usage_date),
    FOREIGN KEY (account_id) REFERENCES gemini_accounts(id) ON DELETE CASCADE,
    INDEX idx_date (usage_date),
    INDEX idx_quota_exceeded (is_quota_exceeded)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gemini_quota_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_id INT NOT NULL,
    event_type ENUM('success', 'failed', 'quota_exceeded', 'rate_limit', 'account_switched') NOT NULL,
    cve_code VARCHAR(50),
    poc_link TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES gemini_accounts(id) ON DELETE CASCADE,
    INDEX idx_account_date (account_id, created_at),
    INDEX idx_event_type (event_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
