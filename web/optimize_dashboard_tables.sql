-- ==========================================
-- 대시보드 집계 테이블 인덱스 최적화
-- ==========================================

-- dashboard_stats_daily: stat_date 인덱스 강화
SET @stmt := (
    SELECT IF(
        EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
            WHERE table_schema = DATABASE()
              AND table_name = 'dashboard_stats_daily'
              AND index_name = 'idx_stat_date_desc'
        ),
        'SELECT "idx_stat_date_desc already exists"',
        'ALTER TABLE dashboard_stats_daily ADD INDEX idx_stat_date_desc (stat_date DESC)'
    )
);
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- dashboard_cvss_distribution: 복합 인덱스
SET @stmt := (
    SELECT IF(
        EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
            WHERE table_schema = DATABASE()
              AND table_name = 'dashboard_cvss_distribution'
              AND index_name = 'idx_date_severity'
        ),
        'SELECT "idx_date_severity already exists"',
        'ALTER TABLE dashboard_cvss_distribution ADD INDEX idx_date_severity (stat_date, severity)'
    )
);
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- dashboard_product_stats: 복합 인덱스
SET @stmt := (
    SELECT IF(
        EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
            WHERE table_schema = DATABASE()
              AND table_name = 'dashboard_product_stats'
              AND index_name = 'idx_date_rank_product'
        ),
        'SELECT "idx_date_rank_product already exists"',
        'ALTER TABLE dashboard_product_stats ADD INDEX idx_date_rank_product (stat_date, rank_order, product)'
    )
);
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- dashboard_cwe_stats: 복합 인덱스
SET @stmt := (
    SELECT IF(
        EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
            WHERE table_schema = DATABASE()
              AND table_name = 'dashboard_cwe_stats'
              AND index_name = 'idx_date_rank_cwe'
        ),
        'SELECT "idx_date_rank_cwe already exists"',
        'ALTER TABLE dashboard_cwe_stats ADD INDEX idx_date_rank_cwe (stat_date, rank_order, cwe_id)'
    )
);
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- dashboard_attack_type_stats: 복합 인덱스
SET @stmt := (
    SELECT IF(
        EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
            WHERE table_schema = DATABASE()
              AND table_name = 'dashboard_attack_type_stats'
              AND index_name = 'idx_date_rank_attack'
        ),
        'SELECT "idx_date_rank_attack already exists"',
        'ALTER TABLE dashboard_attack_type_stats ADD INDEX idx_date_rank_attack (stat_date, rank_order, attack_type)'
    )
);
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- dashboard_attack_stage_stats: 복합 인덱스
SET @stmt := (
    SELECT IF(
        EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
            WHERE table_schema = DATABASE()
              AND table_name = 'dashboard_attack_stage_stats'
              AND index_name = 'idx_date_rank_stage'
        ),
        'SELECT "idx_date_rank_stage already exists"',
        'ALTER TABLE dashboard_attack_stage_stats ADD INDEX idx_date_rank_stage (stat_date, rank_order, vuln_stage)'
    )
);
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- dashboard_recent_pocs: 복합 인덱스
SET @stmt := (
    SELECT IF(
        EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
            WHERE table_schema = DATABASE()
              AND table_name = 'dashboard_recent_pocs'
              AND index_name = 'idx_date_rank_poc'
        ),
        'SELECT "idx_date_rank_poc already exists"',
        'ALTER TABLE dashboard_recent_pocs ADD INDEX idx_date_rank_poc (stat_date, rank_order, poc_id)'
    )
);
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 쿼리 캐시 확인
SHOW VARIABLES LIKE 'query_cache%';

SELECT '✅ 대시보드 인덱스 최적화 완료' AS status;

