-- ==========================================
-- 대시보드 통계 집계 테이블 및 VIEW 생성
-- ==========================================

-- 1. 일별 통계 집계 테이블
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

-- 2. CVSS 분포 집계 테이블 (2025년 기준)
CREATE TABLE IF NOT EXISTS dashboard_cvss_distribution (
    id INT AUTO_INCREMENT PRIMARY KEY,
    stat_date DATE NOT NULL,
    severity VARCHAR(20) NOT NULL,
    count INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_date_severity (stat_date, severity),
    INDEX idx_stat_date (stat_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. 제품별 통계 집계 테이블 (2025년 기준, Top 10)
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

-- 4. CWE 유형별 통계 집계 테이블 (2025년 기준, Top 10)
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

-- 5. 공격 유형별 통계 집계 테이블 (2025년 기준, Top 10)
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

-- 6. 공격 단계별 통계 집계 테이블 (AI 분석 기반)
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

-- ==========================================
-- VIEW 생성: 최신 통계 데이터
-- ==========================================

-- 기본 통계 VIEW
CREATE OR REPLACE VIEW v_dashboard_stats_latest AS
SELECT 
    stat_date,
    total_cves,
    total_pocs,
    analyzed_pocs,
    unique_analyzed_pocs,
    pending_pocs,
    cves_2025,
    pocs_today,
    updated_at
FROM dashboard_stats_daily
ORDER BY stat_date DESC
LIMIT 1;

-- CVSS 분포 VIEW
CREATE OR REPLACE VIEW v_dashboard_cvss_latest AS
SELECT 
    severity,
    count
FROM dashboard_cvss_distribution
WHERE stat_date = (SELECT MAX(stat_date) FROM dashboard_cvss_distribution)
ORDER BY 
    FIELD(severity, 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW') ASC;

-- 제품별 통계 VIEW (Top 10)
CREATE OR REPLACE VIEW v_dashboard_products_latest AS
SELECT 
    product,
    count
FROM dashboard_product_stats
WHERE stat_date = (SELECT MAX(stat_date) FROM dashboard_product_stats)
ORDER BY rank_order ASC
LIMIT 10;

-- CWE 유형별 통계 VIEW (Top 10)
CREATE OR REPLACE VIEW v_dashboard_cwe_latest AS
SELECT 
    cwe_id,
    count
FROM dashboard_cwe_stats
WHERE stat_date = (SELECT MAX(stat_date) FROM dashboard_cwe_stats)
ORDER BY rank_order ASC
LIMIT 10;

-- 공격 유형별 통계 VIEW (Top 10)
CREATE OR REPLACE VIEW v_dashboard_attack_type_latest AS
SELECT 
    attack_type,
    count
FROM dashboard_attack_type_stats
WHERE stat_date = (SELECT MAX(stat_date) FROM dashboard_attack_type_stats)
ORDER BY rank_order ASC
LIMIT 10;

-- 공격 단계별 통계 VIEW (Top 10)
CREATE OR REPLACE VIEW v_dashboard_attack_stage_latest AS
SELECT 
    vuln_stage,
    count
FROM dashboard_attack_stage_stats
WHERE stat_date = (SELECT MAX(stat_date) FROM dashboard_attack_stage_stats)
ORDER BY rank_order ASC
LIMIT 10;

-- ==========================================
-- 초기 데이터 삽입 프로시저
-- ==========================================

DELIMITER $$

CREATE PROCEDURE IF NOT EXISTS update_dashboard_stats()
BEGIN
    DECLARE current_date DATE;
    SET current_date = CURDATE();
    
    -- 1. 기본 통계 업데이트
    INSERT INTO dashboard_stats_daily (
        stat_date,
        total_cves,
        total_pocs,
        analyzed_pocs,
        unique_analyzed_pocs,
        pending_pocs,
        cves_2025,
        pocs_today
    )
    SELECT 
        current_date,
        (SELECT MAX(id) FROM CVE_Info),
        (SELECT MAX(id) FROM Github_CVE_Info),
        (SELECT COUNT(*) FROM CVE_Packet_AI_Analysis),
        (SELECT COUNT(DISTINCT link) FROM CVE_Packet_AI_Analysis),
        (SELECT COUNT(*) FROM Github_CVE_Info WHERE AI_chk = 'N'),
        (SELECT COUNT(*) FROM CVE_Info WHERE CVE_Code LIKE 'CVE-2025-%'),
        (SELECT COUNT(*) FROM Github_CVE_Info WHERE DATE(collect_time) = current_date)
    ON DUPLICATE KEY UPDATE
        total_cves = VALUES(total_cves),
        total_pocs = VALUES(total_pocs),
        analyzed_pocs = VALUES(analyzed_pocs),
        unique_analyzed_pocs = VALUES(unique_analyzed_pocs),
        pending_pocs = VALUES(pending_pocs),
        cves_2025 = VALUES(cves_2025),
        pocs_today = VALUES(pocs_today);
    
    -- 2. CVSS 분포 업데이트
    DELETE FROM dashboard_cvss_distribution WHERE stat_date = current_date;
    INSERT INTO dashboard_cvss_distribution (stat_date, severity, count)
    SELECT 
        current_date,
        CVSS_Serverity,
        COUNT(*) as count
    FROM CVE_Info
    WHERE CVSS_Serverity IS NOT NULL
        AND CVE_Code LIKE 'CVE-2025-%'
    GROUP BY CVSS_Serverity;
    
    -- 3. 제품별 통계 업데이트 (Top 10)
    DELETE FROM dashboard_product_stats WHERE stat_date = current_date;
    INSERT INTO dashboard_product_stats (stat_date, product, count, rank_order)
    SELECT 
        current_date,
        product,
        count,
        @rank := @rank + 1 as rank_order
    FROM (
        SELECT 
            CASE 
                WHEN product LIKE '%,%' THEN TRIM(SUBSTRING_INDEX(product, ',', 1))
                ELSE TRIM(product)
            END as product,
            COUNT(*) as count
        FROM CVE_Info
        WHERE product IS NOT NULL 
            AND product != '' 
            AND LOWER(product) NOT LIKE '%n/a%'
            AND product NOT LIKE '%N/A%'
            AND TRIM(product) != 'N/A'
            AND LENGTH(TRIM(product)) > 2
            AND CVE_Code LIKE 'CVE-2025-%'
        GROUP BY 
            CASE 
                WHEN product LIKE '%,%' THEN TRIM(SUBSTRING_INDEX(product, ',', 1))
                ELSE TRIM(product)
            END
        ORDER BY count DESC
        LIMIT 10
    ) AS product_stats, (SELECT @rank := 0) AS r;
    
    -- 4. CWE 유형별 통계 업데이트 (Top 10)
    DELETE FROM dashboard_cwe_stats WHERE stat_date = current_date;
    INSERT INTO dashboard_cwe_stats (stat_date, cwe_id, count, rank_order)
    SELECT 
        current_date,
        cwe_id,
        count,
        @rank := @rank + 1 as rank_order
    FROM (
        SELECT 
            cweId as cwe_id,
            COUNT(*) as count
        FROM CVE_Info
        WHERE cweId IS NOT NULL 
            AND cweId != ''
            AND CVE_Code LIKE 'CVE-2025-%'
        GROUP BY cweId
        ORDER BY count DESC
        LIMIT 10
    ) AS cwe_stats, (SELECT @rank := 0) AS r;
    
    -- 5. 공격 유형별 통계 업데이트 (Top 10)
    DELETE FROM dashboard_attack_type_stats WHERE stat_date = current_date;
    INSERT INTO dashboard_attack_type_stats (stat_date, attack_type, count, rank_order)
    SELECT 
        current_date,
        attack_type,
        count,
        @rank := @rank + 1 as rank_order
    FROM (
        SELECT 
            Attak_Type as attack_type,
            COUNT(*) as count
        FROM CVE_Info
        WHERE Attak_Type IS NOT NULL 
            AND Attak_Type != ''
            AND CVE_Code LIKE 'CVE-2025-%'
        GROUP BY Attak_Type
        ORDER BY count DESC
        LIMIT 10
    ) AS attack_stats, (SELECT @rank := 0) AS r;
    
    -- 6. 공격 단계별 통계 업데이트 (Top 10)
    DELETE FROM dashboard_attack_stage_stats WHERE stat_date = current_date;
    INSERT INTO dashboard_attack_stage_stats (stat_date, vuln_stage, count, rank_order)
    SELECT 
        current_date,
        vuln_stage,
        count,
        @rank := @rank + 1 as rank_order
    FROM (
        SELECT 
            a.vuln_stage,
            COUNT(*) as count
        FROM CVE_Packet_AI_Analysis a
        LEFT JOIN Github_CVE_Info g ON a.link = g.link
        LEFT JOIN CVE_Info c ON g.cve = c.CVE_Code
        WHERE a.vuln_stage IS NOT NULL 
            AND a.vuln_stage != ''
            AND c.CVE_Code LIKE 'CVE-2025-%'
        GROUP BY a.vuln_stage
        ORDER BY count DESC
        LIMIT 10
    ) AS stage_stats, (SELECT @rank := 0) AS r;
    
END$$

DELIMITER ;

-- 초기 데이터 생성 (현재 시점 기준)
CALL update_dashboard_stats();

-- 완료 메시지
SELECT '✅ 대시보드 통계 테이블, VIEW, 프로시저 생성 완료!' AS status;
SELECT '📊 초기 통계 데이터 삽입 완료!' AS status;
SELECT '⏰ 매일 자동 갱신하려면 아래 명령을 cron 또는 스케줄러에 등록하세요:' AS info;
SELECT 'CALL update_dashboard_stats();' AS command;

