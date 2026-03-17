-- API 토큰 관리 테이블 생성
USE TOTORO;

CREATE TABLE IF NOT EXISTS api_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(64) UNIQUE NOT NULL COMMENT 'API 토큰 (SHA256 해시)',
    name VARCHAR(100) NOT NULL COMMENT '토큰 이름/설명',
    created_by VARCHAR(50) NOT NULL COMMENT '생성자 ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성 시간',
    last_used_at TIMESTAMP NULL COMMENT '마지막 사용 시간',
    expires_at TIMESTAMP NULL COMMENT '만료 시간 (NULL이면 무제한)',
    is_active BOOLEAN DEFAULT TRUE COMMENT '활성화 상태',
    permissions TEXT COMMENT '권한 (JSON 형식)',
    INDEX idx_token (token),
    INDEX idx_created_by (created_by),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='API 토큰 관리';

-- 샘플 데이터 (테스트용, 실제 운영에서는 삭제)
-- INSERT INTO api_tokens (token, name, created_by, permissions) 
-- VALUES ('test_token_1234567890', '테스트 토큰', 'admin', '{"read": true, "write": false}');

SELECT '✅ API 토큰 테이블 생성 완료!' as Result;

