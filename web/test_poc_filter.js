const mysql = require('mysql2/promise');
const fs = require('fs');

(async () => {
    const config = JSON.parse(fs.readFileSync('../config.json', 'utf8'));
    const conn = await mysql.createConnection(config.database);
    
    console.log('==========================================');
    console.log('🔍 POC 필터 테스트');
    console.log('==========================================\n');
    
    // 1. POC가 있는 CVE 개수
    console.log('1️⃣  POC가 있는 CVE 개수...');
    let start = Date.now();
    const [[withPoc]] = await conn.query(`
        SELECT COUNT(DISTINCT ci.CVE_Code) as count
        FROM CVE_Info ci
        INNER JOIN (SELECT DISTINCT cve FROM Github_CVE_Info) gi ON ci.CVE_Code = gi.cve
    `);
    let elapsed = Date.now() - start;
    console.log(`   POC 있음: ${withPoc.count.toLocaleString()}개 (${elapsed}ms)`);
    
    // 2. POC가 없는 CVE 개수
    console.log('\n2️⃣  POC가 없는 CVE 개수...');
    start = Date.now();
    const [[withoutPoc]] = await conn.query(`
        SELECT COUNT(*) as count
        FROM CVE_Info ci
        LEFT JOIN Github_CVE_Info gi ON ci.CVE_Code = gi.cve
        WHERE gi.cve IS NULL
    `);
    elapsed = Date.now() - start;
    console.log(`   POC 없음: ${withoutPoc.count.toLocaleString()}개 (${elapsed}ms)`);
    
    // 3. 실제 POC 필터 쿼리 테스트 (POC 있음)
    console.log('\n3️⃣  POC 있음 필터 쿼리 테스트...');
    start = Date.now();
    const [result] = await conn.query(`
        SELECT 
            ci.CVE_Code,
            ci.state,
            ci.product,
            ci.CVSS_Score,
            ci.CVSS_Serverity
        FROM CVE_Info ci
        INNER JOIN (SELECT DISTINCT cve FROM Github_CVE_Info) gi ON ci.CVE_Code = gi.cve
        ORDER BY ci.id DESC
        LIMIT 20
    `);
    elapsed = Date.now() - start;
    console.log(`   결과: ${result.length}건 (${elapsed}ms)`);
    if (result.length > 0) {
        console.log(`   예시: ${result[0].CVE_Code} (${result[0].product || 'N/A'})`);
    }
    
    // 4. Github_CVE_Info 테이블 확인
    console.log('\n4️⃣  Github_CVE_Info 테이블 확인...');
    const [[pocCount]] = await conn.query('SELECT COUNT(*) as count FROM Github_CVE_Info');
    const [[distinctCveCount]] = await conn.query('SELECT COUNT(DISTINCT cve) as count FROM Github_CVE_Info');
    console.log(`   전체 POC: ${pocCount.count.toLocaleString()}개`);
    console.log(`   고유 CVE: ${distinctCveCount.count.toLocaleString()}개`);
    
    console.log('\n==========================================');
    console.log('✅ 테스트 완료');
    console.log('==========================================\n');
    
    await conn.end();
})().catch(err => {
    console.error('❌ 오류:', err.message);
    process.exit(1);
});

