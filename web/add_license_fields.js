const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function addLicenseFields() {
    console.log('==========================================');
    console.log('📄 GitHub_CVE_Info 테이블에 라이센스 필드 추가...');
    console.log('==========================================\n');

    // DB 연결 설정 (config.json에서 읽기)
    const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
    
    const pool = mysql.createPool({
        host: config.database.host,
        port: config.database.port,
        user: config.database.user,
        password: config.database.password,
        database: config.database.database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        console.log('1️⃣  라이센스 필드 추가 중...');
        
        // 라이센스 필드 추가
        await pool.query(`
            ALTER TABLE Github_CVE_Info 
            ADD COLUMN license_name VARCHAR(100) DEFAULT NULL COMMENT '라이센스 이름 (예: MIT, Apache-2.0, GPL-3.0)',
            ADD COLUMN license_key VARCHAR(50) DEFAULT NULL COMMENT '라이센스 키 (예: mit, apache-2.0, gpl-3.0)',
            ADD COLUMN license_url TEXT DEFAULT NULL COMMENT '라이센스 URL',
            ADD COLUMN license_description TEXT DEFAULT NULL COMMENT '라이센스 설명'
        `);
        console.log('✅ 라이센스 필드 추가 완료');

        console.log('2️⃣  인덱스 추가 중...');
        
        // 인덱스 추가
        await pool.query(`
            ALTER TABLE Github_CVE_Info 
            ADD INDEX idx_license_name (license_name(50)),
            ADD INDEX idx_license_key (license_key(20))
        `);
        console.log('✅ 인덱스 추가 완료');

        console.log('3️⃣  기존 데이터 확인 중...');
        
        // 기존 데이터 확인
        const [stats] = await pool.query(`
            SELECT 
                COUNT(*) as total_records,
                COUNT(license_name) as records_with_license,
                COUNT(DISTINCT license_name) as unique_licenses
            FROM Github_CVE_Info
        `);
        
        console.log('📊 데이터베이스 통계:');
        console.log(`   - 전체 레코드: ${stats[0].total_records.toLocaleString()}개`);
        console.log(`   - 라이센스 정보 있는 레코드: ${stats[0].records_with_license.toLocaleString()}개`);
        console.log(`   - 고유 라이센스 수: ${stats[0].unique_licenses}개`);

        console.log('\n✅ 라이센스 필드 추가가 완료되었습니다!');
        console.log('💡 이제 CVE 수집 시 라이센스 정보가 자동으로 수집됩니다.');

    } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('⚠️  라이센스 필드가 이미 존재합니다. 스킵합니다.');
        } else {
            console.error('❌ 오류 발생:', err.message);
            throw err;
        }
    } finally {
        await pool.end();
    }
}

addLicenseFields().catch(console.error);
