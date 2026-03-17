-- ================================================================================
-- 004: CVE_Packet_AI_Analysis 테이블 (AI 분석 결과)
-- ================================================================================

CREATE TABLE IF NOT EXISTS CVE_Packet_AI_Analysis (
    id INT AUTO_INCREMENT PRIMARY KEY,
    link TEXT,
    download_path TEXT,
    cve_summary TEXT,
    step INT,
    packet_text LONGTEXT,
    vuln_stage TEXT,
    stage_description TEXT,
    mitre_tactic TEXT,
    mitre_technique TEXT,
    snort_rule TEXT,
    remediation TEXT,
    expected_response TEXT,
    affected_products JSON,
    INDEX idx_link (link(255)),
    INDEX idx_step (step)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
