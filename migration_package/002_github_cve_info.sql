-- ================================================================================
-- 002: Github_CVE_Info 테이블 (GitHub POC 정보)
-- ================================================================================

CREATE TABLE IF NOT EXISTS Github_CVE_Info (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date TEXT,
    collect_time TEXT,
    link TEXT,
    title TEXT,
    writer TEXT,
    cve TEXT,
    readme LONGTEXT,
    download_path TEXT,
    status TEXT DEFAULT 'N',
    trans_msg LONGTEXT,
    AI_chk TEXT DEFAULT 'N',
    cve_info_status TEXT DEFAULT 'N',
    INDEX idx_cve (cve(255)),
    INDEX idx_link (link(255)),
    INDEX idx_AI_chk (AI_chk(1)),
    INDEX idx_status (status(1)),
    INDEX idx_cve_info_status (cve_info_status(1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
