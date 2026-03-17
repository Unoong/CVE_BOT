-- ================================================================================
-- 012: 대시보드 통계 테이블 (VIEW/프로시저는 웹 init_dashboard_stats 참고)
-- ================================================================================

CREATE TABLE IF NOT EXISTS dashboard_stats_daily (
    id INT AUTO_INCREMENT PRIMARY KEY,
    stat_date DATE NOT NULL UNIQUE,
    total_cves INT DEFAULT 0,
    total_pocs INT DEFAULT 0,
    analyzed_pocs INT DEFAULT 0,
    unique_analyzed_pocs INT DEFAULT 0,
    pending_pocs INT DEFAULT 0,
    cves_2025 INT DEFAULT 0,
    pocs_today INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_stat_date (stat_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dashboard_cvss_distribution (
    id INT AUTO_INCREMENT PRIMARY KEY,
    stat_date DATE NOT NULL,
    severity VARCHAR(20) NOT NULL,
    count INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_date_severity (stat_date, severity),
    INDEX idx_stat_date (stat_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dashboard_product_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    stat_date DATE NOT NULL,
    product VARCHAR(255) NOT NULL,
    count INT DEFAULT 0,
    rank_order INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_date_product (stat_date, product),
    INDEX idx_stat_date (stat_date),
    INDEX idx_rank (stat_date, rank_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dashboard_cwe_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    stat_date DATE NOT NULL,
    cwe_id VARCHAR(50) NOT NULL,
    count INT DEFAULT 0,
    rank_order INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_date_cwe (stat_date, cwe_id),
    INDEX idx_stat_date (stat_date),
    INDEX idx_rank (stat_date, rank_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dashboard_attack_type_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    stat_date DATE NOT NULL,
    attack_type VARCHAR(255) NOT NULL,
    count INT DEFAULT 0,
    rank_order INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_date_attack (stat_date, attack_type),
    INDEX idx_stat_date (stat_date),
    INDEX idx_rank (stat_date, rank_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dashboard_attack_stage_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    stat_date DATE NOT NULL,
    vuln_stage VARCHAR(255) NOT NULL,
    count INT DEFAULT 0,
    rank_order INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_date_stage (stat_date, vuln_stage),
    INDEX idx_stat_date (stat_date),
    INDEX idx_rank (stat_date, rank_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dashboard_recent_cves (
    id INT AUTO_INCREMENT PRIMARY KEY,
    stat_date DATE NOT NULL,
    cve_code VARCHAR(50) NOT NULL,
    product VARCHAR(255),
    collect_time DATETIME,
    cvss_score DECIMAL(3,1),
    cvss_severity VARCHAR(20),
    state VARCHAR(20),
    rank_order INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_stat_date (stat_date),
    INDEX idx_rank (stat_date, rank_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dashboard_latest_cves (
    id INT AUTO_INCREMENT PRIMARY KEY,
    stat_date DATE NOT NULL,
    cve_code VARCHAR(50) NOT NULL,
    product VARCHAR(255),
    datePublished DATE,
    cvss_score DECIMAL(3,1),
    cvss_severity VARCHAR(20),
    state VARCHAR(20),
    rank_order INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_stat_date (stat_date),
    INDEX idx_rank (stat_date, rank_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dashboard_recent_pocs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    stat_date DATE NOT NULL,
    poc_id INT,
    title VARCHAR(512),
    writer VARCHAR(255),
    cve VARCHAR(50),
    collect_time DATETIME,
    ai_chk VARCHAR(5),
    status VARCHAR(20),
    link TEXT,
    rank_order INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_stat_date (stat_date),
    INDEX idx_rank (stat_date, rank_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
