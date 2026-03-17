const mysql = require('mysql2/promise');
const fs = require('fs');

(async () => {
    const config = JSON.parse(fs.readFileSync('../config.json', 'utf8'));
    const conn = await mysql.createConnection(config.database);
    
    console.log('==========================================');
    console.log('🔍 실제 쿼리 테스트');
    console.log('==========================================\n');
    
    // 서버와 동일한 쿼리 실행
    const [result] = await conn.query(`
        SELECT
            ci.CVE_Code,
            ci.state,
            ci.product,
            ci.CVSS_Score,
            ci.CVSS_Serverity,
            ci.collect_time,
            ci.dateReserved,
            ci.datePublished,
            ci.dateUpdated,
            0 as poc_count
        FROM CVE_Info ci
        INNER JOIN (
            SELECT DISTINCT g.cve, MAX(g.id) as max_id
            FROM Github_CVE_Info g
            WHERE g.AI_chk = 'Y'
            GROUP BY g.cve
        ) gi ON ci.CVE_Code = gi.cve
        ORDER BY gi.max_id DESC
        LIMIT 20 OFFSET 0
    `);
    
    console.log(`결과: ${result.length}건\n`);
    
    if (result.length > 0) {
        console.log('📋 첫 5개 CVE:\n');
        for (let i = 0; i < Math.min(5, result.length); i++) {
            const cve = result[i];
            console.log(`${i + 1}. ${cve.CVE_Code}`);
            
            // 이 CVE의 POC 확인
            const [[poc]] = await conn.query(
                'SELECT COUNT(*) as count, AI_chk FROM Github_CVE_Info WHERE cve = ? GROUP BY AI_chk',
                [cve.CVE_Code]
            );
            
            if (poc) {
                console.log(`   POC: ${poc.count}개 (AI_chk: ${poc.AI_chk})`);
            } else {
                console.log(`   POC: 없음 ❌`);
            }
            
            // 이 CVE의 AI 분석 확인
            const [[ai]] = await conn.query(
                `SELECT COUNT(*) as count FROM CVE_Packet_AI_Analysis a
                 INNER JOIN Github_CVE_Info g ON a.link = g.link
                 WHERE g.cve = ?`,
                [cve.CVE_Code]
            );
            
            if (ai && ai.count > 0) {
                console.log(`   AI 분석: ${ai.count}개 ✅\n`);
            } else {
                console.log(`   AI 분석: 없음 ❌\n`);
            }
        }
    }
    
    console.log('==========================================\n');
    await conn.end();
})().catch(err => {
    console.error('❌ 오류:', err.message);
    process.exit(1);
});

