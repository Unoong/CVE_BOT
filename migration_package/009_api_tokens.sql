-- ================================================================================
-- 009: api_tokens 테이블
-- ================================================================================

CREATE TABLE IF NOT EXISTS api_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(64) UNIQUE NOT NULL COMMENT 'API 토큰',
    name VARCHAR(100) NOT NULL COMMENT '토큰 이름/설명',
    created_by VARCHAR(50) NOT NULL COMMENT '생성자 ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    permissions TEXT COMMENT '권한 JSON',
    INDEX idx_token (token),
    INDEX idx_created_by (created_by),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
