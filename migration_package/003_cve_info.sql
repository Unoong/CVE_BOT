-- ================================================================================
-- 003: CVE_Info 테이블 (CVE 상세 정보)
-- ================================================================================

CREATE TABLE IF NOT EXISTS CVE_Info (
    id INT AUTO_INCREMENT PRIMARY KEY,
    collect_time TEXT,
    CVE_Code VARCHAR(50) UNIQUE,
    state TEXT,
    dateReserved TEXT,
    datePublished TEXT,
    dateUpdated TEXT,
    product TEXT,
    descriptions TEXT,
    effect_version TEXT,
    cweId TEXT,
    Attak_Type TEXT,
    CVSS_Score TEXT,
    CVSS_Vertor TEXT,
    CVSS_Serverity TEXT,
    CVSS_vertorString TEXT,
    solutions TEXT,
    Response_data LONGTEXT,
    INDEX idx_CVE_Code (CVE_Code),
    INDEX idx_CVSS_Serverity (CVSS_Serverity(20))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
