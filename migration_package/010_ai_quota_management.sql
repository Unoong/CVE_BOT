-- ================================================================================
-- 010: AI_Quota_Management 테이블
-- ================================================================================

CREATE TABLE IF NOT EXISTS AI_Quota_Management (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_email VARCHAR(255) NOT NULL,
    daily_analysis_count INT DEFAULT 0,
    quota_exhausted_count INT DEFAULT 0,
    last_429_error_time DATETIME NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_account (account_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
