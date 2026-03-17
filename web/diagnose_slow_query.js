const mysql = require('mysql2/promise');
const fs = require('fs');

(async () => {
    console.log('==========================================');
    console.log('🔍 대시보드 쿼리 성능 진단');
    console.log('==========================================\n');
    
    const config = JSON.parse(fs.readFileSync('../config.json', 'utf8'));
    const conn = await mysql.createConnection(config.database);
    
    // 1. dashboard_stats_daily 테이블 조회 시간
    console.log('1️⃣  dashboard_stats_daily 조회...');
    let start = Date.now();
    const [[basicStats]] = await conn.query(`
        SELECT * FROM dashboard_stats_daily
        ORDER BY stat_date DESC
        LIMIT 1
    `);
    let elapsed = Date.now() - start;
    console.log(`   ⏱️  ${elapsed}ms`);
    console.log(`   📊 결과: ${basicStats ? 'OK' : 'NULL'}\n`);
    
    // 2. dashboard_cvss_distribution 조회 시간
    console.log('2️⃣  dashboard_cvss_distribution 조회...');
    start = Date.now();
    const [cvssData] = await conn.query(`
        SELECT severity AS CVSS_Serverity, count
        FROM dashboard_cvss_distribution
        WHERE stat_date = ?
        ORDER BY FIELD(severity, 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW') ASC
    `, [basicStats.stat_date]);
    elapsed = Date.now() - start;
    console.log(`   ⏱️  ${elapsed}ms`);
    console.log(`   📊 결과: ${cvssData.length}건\n`);
    
    // 3. 인덱스 확인
    console.log('3️⃣  dashboard_stats_daily 인덱스 확인...');
    const [indexes] = await conn.query('SHOW INDEXES FROM dashboard_stats_daily');
    if (indexes.length > 1) {
        indexes.forEach(idx => {
            console.log(`   📋 ${idx.Key_name}: ${idx.Column_name}`);
        });
    } else {
        console.log('   ⚠️  인덱스 없음 (PRIMARY만 존재)');
    }
    console.log('');
    
    // 4. 연결 풀 상태 확인
    console.log('4️⃣  MySQL 프로세스 목록...');
    const [processList] = await conn.query('SHOW PROCESSLIST');
    console.log(`   📊 현재 연결 수: ${processList.length}개`);
    const sleeping = processList.filter(p => p.Command === 'Sleep').length;
    const query = processList.filter(p => p.Command === 'Query').length;
    console.log(`   💤 Sleep: ${sleeping}개, 🔄 Query: ${query}개\n`);
    
    // 5. 테이블 상태
    console.log('5️⃣  테이블 상태...');
    const [tableStatus] = await conn.query("SHOW TABLE STATUS LIKE 'dashboard_stats_daily'");
    if (tableStatus.length > 0) {
        const table = tableStatus[0];
        console.log(`   📊 행 개수: ${table.Rows}`);
        console.log(`   💾 데이터 크기: ${(table.Data_length / 1024).toFixed(2)} KB`);
        console.log(`   🔍 인덱스 크기: ${(table.Index_length / 1024).toFixed(2)} KB\n`);
    }
    
    console.log('==========================================');
    console.log('✅ 진단 완료');
    console.log('==========================================\n');
    
    await conn.end();
})().catch(err => {
    console.error('❌ 오류:', err.message);
    process.exit(1);
});

