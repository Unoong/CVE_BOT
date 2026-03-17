const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function initDashboardStats() {
    console.log('==========================================');
    console.log('📊 대시보드 통계 테이블 초기화 시작...');
    console.log('==========================================\n');

    // DB 연결 설정 (config.json에서 읽기)
    const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json'), 'utf8'));
    
    const pool = mysql.createPool({
        host: config.database.host,
        port: config.database.port,
        user: config.database.user,
        password: config.database.password,
        database: config.database.database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        multipleStatements: true  // 여러 쿼리 한번에 실행
    });

    try {
        console.log('1️⃣  테이블 생성 중...');
        
        // 1. 테이블 생성
        await pool.query(`
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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ dashboard_stats_daily 테이블 생성 완료');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS dashboard_cvss_distribution (
                id INT AUTO_INCREMENT PRIMARY KEY,
                stat_date DATE NOT NULL,
                severity VARCHAR(20) NOT NULL,
                count INT DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_date_severity (stat_date, severity),
                INDEX idx_stat_date (stat_date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ dashboard_cvss_distribution 테이블 생성 완료');

        await pool.query(`
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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ dashboard_product_stats 테이블 생성 완료');

        await pool.query(`
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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ dashboard_cwe_stats 테이블 생성 완료');

        await pool.query(`
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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ dashboard_attack_type_stats 테이블 생성 완료');

        await pool.query(`
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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ dashboard_attack_stage_stats 테이블 생성 완료');

        await pool.query(`
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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ dashboard_recent_cves 테이블 생성 완료');
        
        await pool.query(`
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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ dashboard_latest_cves 테이블 생성 완료\n');

        await pool.query(`
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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ dashboard_recent_pocs 테이블 생성 완료\n');

        console.log('2️⃣  초기 통계 데이터 생성 중...');
        const today = new Date().toISOString().split('T')[0];
        
        // 기본 통계 (COUNT 사용 - 정확한 개수)
        const [[cveInfo]] = await pool.query('SELECT COUNT(*) as count FROM CVE_Info');
        const [[pocInfo]] = await pool.query('SELECT COUNT(*) as count FROM Github_CVE_Info');
        const [[analysisInfo]] = await pool.query('SELECT COUNT(*) as count FROM CVE_Packet_AI_Analysis');
        const [[uniqueAnalysisInfo]] = await pool.query('SELECT COUNT(DISTINCT link) as count FROM CVE_Packet_AI_Analysis');
        const [[pendingInfo]] = await pool.query("SELECT COUNT(*) as count FROM Github_CVE_Info WHERE AI_chk = 'N'");
        const [[cves2025Info]] = await pool.query("SELECT COUNT(*) as count FROM CVE_Info WHERE CVE_Code LIKE 'CVE-2025-%'");
        const [[pocsTodayInfo]] = await pool.query("SELECT COUNT(*) as count FROM Github_CVE_Info WHERE DATE(collect_time) = CURDATE()");

        await pool.query(`
            INSERT INTO dashboard_stats_daily (
                stat_date, total_cves, total_pocs, analyzed_pocs, unique_analyzed_pocs, 
                pending_pocs, cves_2025, pocs_today
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                total_cves = VALUES(total_cves),
                total_pocs = VALUES(total_pocs),
                analyzed_pocs = VALUES(analyzed_pocs),
                unique_analyzed_pocs = VALUES(unique_analyzed_pocs),
                pending_pocs = VALUES(pending_pocs),
                cves_2025 = VALUES(cves_2025),
                pocs_today = VALUES(pocs_today)
        `, [
            today,
            cveInfo.count || 0,
            pocInfo.count || 0,
            analysisInfo.count || 0,
            uniqueAnalysisInfo.count || 0,
            pendingInfo.count || 0,
            cves2025Info.count || 0,
            pocsTodayInfo.count || 0
        ]);
        console.log('✅ 기본 통계 삽입 완료');

        // CVSS 분포 (전체 CVE 기준)
        await pool.query('DELETE FROM dashboard_cvss_distribution WHERE stat_date = ?', [today]);
        const [cvssData] = await pool.query(`
            SELECT CVSS_Serverity, COUNT(*) as count
            FROM CVE_Info
            WHERE CVSS_Serverity IS NOT NULL AND CVSS_Serverity != ''
            GROUP BY CVSS_Serverity
        `);
        if (cvssData.length > 0) {
            for (const row of cvssData) {
                await pool.query(
                    'INSERT INTO dashboard_cvss_distribution (stat_date, severity, count) VALUES (?, ?, ?)',
                    [today, row.CVSS_Serverity, row.count]
                );
            }
            console.log(`✅ CVSS 분포 삽입 완료 (${cvssData.length}건)`);
        }

        // 제품별 통계 (Top 100) - 실제 클릭 시와 동일한 로직 사용
        await pool.query('DELETE FROM dashboard_product_stats WHERE stat_date = ?', [today]);
        const [productData] = await pool.query(`
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
                AND LENGTH(TRIM(product)) > 2
                AND CVE_Code LIKE 'CVE-%'
            GROUP BY 
                CASE 
                    WHEN product LIKE '%,%' THEN TRIM(SUBSTRING_INDEX(product, ',', 1))
                    ELSE TRIM(product)
                END
            ORDER BY count DESC
            LIMIT 100
        `);
        if (productData.length > 0) {
            let rank = 1;
            for (const row of productData) {
                await pool.query(
                    'INSERT INTO dashboard_product_stats (stat_date, product, count, rank_order) VALUES (?, ?, ?, ?)',
                    [today, row.product, row.count, rank++]
                );
            }
            console.log(`✅ 제품별 통계 삽입 완료 (${productData.length}건)`);
        }

        // CWE 유형별 통계 (Top 100) - 실제 클릭 시와 동일한 로직 사용
        await pool.query('DELETE FROM dashboard_cwe_stats WHERE stat_date = ?', [today]);
        const [cweData] = await pool.query(`
            SELECT cweId, COUNT(*) as count
            FROM CVE_Info
            WHERE cweId IS NOT NULL AND cweId != ''
            GROUP BY cweId
            ORDER BY count DESC
            LIMIT 100
        `);
        if (cweData.length > 0) {
            let rank = 1;
            for (const row of cweData) {
                await pool.query(
                    'INSERT INTO dashboard_cwe_stats (stat_date, cwe_id, count, rank_order) VALUES (?, ?, ?, ?)',
                    [today, row.cweId, row.count, rank++]
                );
            }
            console.log(`✅ CWE 유형별 통계 삽입 완료 (${cweData.length}건)`);
        }

        // 공격 유형별 통계 (Top 100) - 실제 클릭 시와 동일한 로직 사용
        await pool.query('DELETE FROM dashboard_attack_type_stats WHERE stat_date = ?', [today]);
        const [attackTypeData] = await pool.query(`
            SELECT Attak_Type, COUNT(*) as count
            FROM CVE_Info
            WHERE Attak_Type IS NOT NULL AND Attak_Type != ''
            GROUP BY Attak_Type
            ORDER BY count DESC
            LIMIT 100
        `);
        if (attackTypeData.length > 0) {
            let rank = 1;
            for (const row of attackTypeData) {
                await pool.query(
                    'INSERT INTO dashboard_attack_type_stats (stat_date, attack_type, count, rank_order) VALUES (?, ?, ?, ?)',
                    [today, row.Attak_Type, row.count, rank++]
                );
            }
            console.log(`✅ 공격 유형별 통계 삽입 완료 (${attackTypeData.length}건)`);
        }

        // 공격 단계별 통계 (Top 100) - 실제 클릭 시와 동일한 로직 사용
        await pool.query('DELETE FROM dashboard_attack_stage_stats WHERE stat_date = ?', [today]);
        const [stageData] = await pool.query(`
            SELECT a.vuln_stage, COUNT(DISTINCT c.CVE_Code) as count
            FROM CVE_Packet_AI_Analysis a
            LEFT JOIN Github_CVE_Info g ON a.link = g.link
            LEFT JOIN CVE_Info c ON g.cve = c.CVE_Code
            WHERE a.vuln_stage IS NOT NULL 
                AND a.vuln_stage != ''
                AND c.CVE_Code IS NOT NULL
            GROUP BY a.vuln_stage
            ORDER BY count DESC
            LIMIT 100
        `);
        if (stageData.length > 0) {
            let rank = 1;
            for (const row of stageData) {
                await pool.query(
                    'INSERT INTO dashboard_attack_stage_stats (stat_date, vuln_stage, count, rank_order) VALUES (?, ?, ?, ?)',
                    [today, row.vuln_stage, row.count, rank++]
                );
            }
            console.log(`✅ 공격 단계별 통계 삽입 완료 (${stageData.length}건)`);
        }

        // 최근 수집된 CVE (Top 10)
        await pool.query('DELETE FROM dashboard_recent_cves WHERE stat_date = ?', [today]);
        const [recentCvesData] = await pool.query(`
            SELECT 
                CVE_Code,
                product,
                collect_time,
                CVSS_Score,
                CVSS_Serverity,
                state
            FROM CVE_Info
            WHERE collect_time IS NOT NULL 
                AND collect_time != ''
            ORDER BY 
                CASE WHEN collect_time IS NULL OR collect_time = '' THEN 1 ELSE 0 END,
                collect_time DESC,
                id DESC
            LIMIT 10
        `);
        if (recentCvesData.length > 0) {
            let rank = 1;
            for (const row of recentCvesData) {
                // product 필드 길이 제한 (VARCHAR(255))
                let product = row.product || null;
                if (product && product.length > 255) {
                    product = product.substring(0, 252) + '...';
                }
                await pool.query(
                    'INSERT INTO dashboard_recent_cves (stat_date, cve_code, product, collect_time, cvss_score, cvss_severity, state, rank_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [today, row.CVE_Code, product, row.collect_time, row.CVSS_Score || null, row.CVSS_Serverity || null, row.state || null, rank++]
                );
            }
            console.log(`✅ 최근 수집된 CVE 삽입 완료 (${recentCvesData.length}건)`);
        }

        // 최신 등록된 CVE (Top 10) - datePublished 기준
        await pool.query('DELETE FROM dashboard_latest_cves WHERE stat_date = ?', [today]);
        const [latestCvesData] = await pool.query(`
            SELECT 
                CVE_Code,
                product,
                datePublished,
                CVSS_Score,
                CVSS_Serverity,
                state
            FROM CVE_Info
            WHERE datePublished IS NOT NULL
            ORDER BY datePublished DESC
            LIMIT 10
        `);
        if (latestCvesData.length > 0) {
            let rank = 1;
            for (const row of latestCvesData) {
                // datePublished를 DATE 형식으로 변환 (YYYY-MM-DD)
                const datePublished = row.datePublished ? new Date(row.datePublished).toISOString().split('T')[0] : null;
                await pool.query(
                    'INSERT INTO dashboard_latest_cves (stat_date, cve_code, product, datePublished, cvss_score, cvss_severity, state, rank_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [today, row.CVE_Code, row.product, datePublished, row.CVSS_Score || null, row.CVSS_Serverity || null, row.state || null, rank++]
                );
            }
            console.log(`✅ 최신 등록된 CVE 삽입 완료 (${latestCvesData.length}건)`);
        }

        // 최근 수집된 POC (Top 10)
        await pool.query('DELETE FROM dashboard_recent_pocs WHERE stat_date = ?', [today]);
        const [recentPocData] = await pool.query(`
            SELECT 
                id,
                title,
                writer,
                cve,
                collect_time,
                AI_chk,
                status,
                link
            FROM Github_CVE_Info
            ORDER BY 
                CASE WHEN collect_time IS NULL OR collect_time = '' THEN 1 ELSE 0 END,
                collect_time DESC,
                id DESC
            LIMIT 10
        `);
        if (recentPocData.length > 0) {
            let rank = 1;
            for (const row of recentPocData) {
                await pool.query(
                    'INSERT INTO dashboard_recent_pocs (stat_date, poc_id, title, writer, cve, collect_time, ai_chk, status, link, rank_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [today, row.id, row.title || null, row.writer || null, row.cve || null, row.collect_time || null, row.AI_chk || null, row.status || null, row.link || null, rank++]
                );
            }
            console.log(`✅ 최근 수집된 POC 삽입 완료 (${recentPocData.length}건)`);
        }
 
        console.log('\n==========================================');
        console.log('✅ 대시보드 통계 초기화 완료!');
        console.log('==========================================');
        console.log(`📅 통계 날짜: ${today}`);
        console.log(`📊 전체 CVE: ${cveInfo.count || 0}개`);
        console.log(`📊 전체 POC: ${pocInfo.count || 0}개`);
        console.log(`📊 분석 완료: ${uniqueAnalysisInfo.count || 0}개`);
        console.log('==========================================\n');

    } catch (error) {
        console.error('❌ 오류 발생:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// 실행
initDashboardStats();

