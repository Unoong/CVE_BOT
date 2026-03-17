const mysql = require('mysql2/promise');
const fs = require('fs');

(async () => {
    try {
        const config = JSON.parse(fs.readFileSync('../config.json', 'utf8'));
        const conn = await mysql.createConnection({
            host: config.database.host,
            port: config.database.port,
            user: config.database.user,
            password: config.database.password,
            database: config.database.database
        });
        
        console.log('Optimizing indexes...\n');
        
        const queries = [
            'ALTER TABLE dashboard_stats_daily ADD INDEX idx_stat_date_desc (stat_date DESC)',
            'ALTER TABLE dashboard_cvss_distribution ADD INDEX idx_date_severity (stat_date, severity)',
            'ALTER TABLE dashboard_product_stats ADD INDEX idx_date_rank_product (stat_date, rank_order)',
            'ALTER TABLE dashboard_cwe_stats ADD INDEX idx_date_rank_cwe (stat_date, rank_order)',
            'ALTER TABLE dashboard_attack_type_stats ADD INDEX idx_date_rank_attack (stat_date, rank_order)',
            'ALTER TABLE dashboard_attack_stage_stats ADD INDEX idx_date_rank_stage (stat_date, rank_order)'
        ];
        
        for (const q of queries) {
            try {
                await conn.query(q);
                console.log('OK:', q.substring(0, 60) + '...');
            } catch (e) {
                if (e.message.includes('Duplicate')) {
                    console.log('SKIP: Index already exists');
                } else {
                    console.log('ERROR:', e.message.substring(0, 100));
                }
            }
        }
        
        console.log('\n✅ Optimization complete!');
        await conn.end();
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
})();

