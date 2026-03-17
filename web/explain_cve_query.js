const mysql = require('mysql2/promise');
const fs = require('fs');

(async () => {
    const config = JSON.parse(fs.readFileSync('../config.json', 'utf8'));
    const conn = await mysql.createConnection(config.database);
    
    console.log('==========================================');
    console.log('🔍 CVE 쿼리 실행 계획 분석');
    console.log('==========================================\n');
    
    // 1. 기본 쿼리 (id DESC)
    console.log('1️⃣  ORDER BY id DESC (최적화 버전)');
    const [explain1] = await conn.query(`
        EXPLAIN SELECT CVE_Code, state, product, CVSS_Score, CVSS_Serverity, 
                       collect_time, dateReserved, datePublished, dateUpdated
        FROM CVE_Info
        ORDER BY id DESC
        LIMIT 20
    `);
    console.log('   실행 계획:', JSON.stringify(explain1[0], null, 2));
    
    // 2. 실제 쿼리 실행 시간 측정
    console.log('\n2️⃣  실제 쿼리 실행 시간 측정...');
    let start = Date.now();
    const [result] = await conn.query(`
        SELECT CVE_Code, state, product, CVSS_Score, CVSS_Serverity, 
               collect_time, dateReserved, datePublished, dateUpdated
        FROM CVE_Info
        ORDER BY id DESC
        LIMIT 20
    `);
    let elapsed = Date.now() - start;
    console.log(`   ⏱️  ${elapsed}ms (${result.length}건)`);
    
    // 3. dateReserved 정렬 (느린 버전)
    console.log('\n3️⃣  ORDER BY dateReserved DESC (기존 버전)');
    start = Date.now();
    const [result2] = await conn.query(`
        SELECT CVE_Code, state, product, CVSS_Score, CVSS_Serverity, 
               collect_time, dateReserved, datePublished, dateUpdated
        FROM CVE_Info
        ORDER BY dateReserved DESC
        LIMIT 20
    `);
    elapsed = Date.now() - start;
    console.log(`   ⏱️  ${elapsed}ms (${result2.length}건)`);
    
    // 4. 인덱스 확인
    console.log('\n4️⃣  CVE_Info 인덱스 목록...');
    const [indexes] = await conn.query('SHOW INDEXES FROM CVE_Info');
    const uniqueIndexes = [...new Set(indexes.map(i => i.Key_name))];
    uniqueIndexes.forEach((idx, i) => {
        console.log(`   ${i + 1}. ${idx}`);
    });
    
    // 5. 테이블 통계
    console.log('\n5️⃣  테이블 통계...');
    const [[stats]] = await conn.query('SELECT COUNT(*) as total FROM CVE_Info');
    const [tableStatus] = await conn.query("SHOW TABLE STATUS LIKE 'CVE_Info'");
    console.log(`   전체 행: ${stats.total.toLocaleString()}개`);
    console.log(`   테이블 크기: ${(tableStatus[0].Data_length / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   인덱스 크기: ${(tableStatus[0].Index_length / 1024 / 1024).toFixed(2)} MB`);
    
    console.log('\n==========================================');
    console.log('✅ 분석 완료');
    console.log('==========================================\n');
    
    await conn.end();
})().catch(err => {
    console.error('❌ 오류:', err.message);
    process.exit(1);
});

