const mysql = require('mysql2/promise');
const fs = require('fs');

(async () => {
    try {
        console.log('==========================================');
        console.log('🗑️  2020년 이전 CVE 데이터 삭제');
        console.log('==========================================\n');
        
        const config = JSON.parse(fs.readFileSync('../config.json', 'utf8'));
        const conn = await mysql.createConnection({
            host: config.database.host,
            port: config.database.port,
            user: config.database.user,
            password: config.database.password,
            database: config.database.database
        });
        
        // 1. 삭제 전 개수 확인
        console.log('📊 삭제 전 데이터 확인 중...\n');
        
        const [[totalCount]] = await conn.query(`SELECT COUNT(*) as count FROM CVE_Info`);
        console.log(`   전체 CVE: ${totalCount.count.toLocaleString()}개`);
        
        const [[oldCount]] = await conn.query(`
            SELECT COUNT(*) as count FROM CVE_Info
            WHERE CVE_Code < 'CVE-2020-'
        `);
        console.log(`   2020년 이전: ${oldCount.count.toLocaleString()}개 (삭제 대상)`);
        
        const [[newCount]] = await conn.query(`
            SELECT COUNT(*) as count FROM CVE_Info
            WHERE CVE_Code >= 'CVE-2020-'
        `);
        console.log(`   2020년 이후: ${newCount.count.toLocaleString()}개 (유지)\n`);
        
        if (oldCount.count === 0) {
            console.log('✅ 삭제할 데이터가 없습니다.\n');
            await conn.end();
            return;
        }
        
        // 2. 삭제 실행
        console.log('🗑️  삭제 실행 중... (최적화 제외, 빠른 삭제)');
        console.log('   예상 시간: 약 ' + Math.ceil(oldCount.count / 1000) + '초\n');
        
        const startTime = Date.now();
        
        const [result] = await conn.query(`
            DELETE FROM CVE_Info WHERE CVE_Code < 'CVE-2020-'
        `);
        
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        
        console.log('==========================================');
        console.log('✅ 삭제 완료!');
        console.log('==========================================');
        console.log(`📊 삭제된 행: ${result.affectedRows.toLocaleString()}개`);
        console.log(`⏱️  소요 시간: ${elapsed}초`);
        console.log('==========================================\n');
        
        // 3. 삭제 후 확인
        const [[afterCount]] = await conn.query(`SELECT COUNT(*) as count FROM CVE_Info`);
        console.log(`✅ 남은 CVE: ${afterCount.count.toLocaleString()}개\n`);
        
        console.log('💡 테이블 최적화는 나중에 수동으로 실행하세요:');
        console.log('   OPTIMIZE TABLE CVE_Info;\n');
        
        await conn.end();
    } catch (error) {
        console.error('\n❌ 오류:', error.message);
        process.exit(1);
    }
})();

