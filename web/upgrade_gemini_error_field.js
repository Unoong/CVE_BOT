const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function upgradeErrorField() {
    console.log('================================================================================');
    console.log('📝 Gemini 에러 메시지 필드 확대');
    console.log('================================================================================\n');

    try {
        const configPath = path.join(__dirname, '../config.json');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

        const pool = mysql.createPool({
            host: config.database.host,
            port: config.database.port,
            user: config.database.user,
            password: config.database.password,
            database: config.database.database
        });

        console.log('✅ DB 연결 성공\n');

        // ALTER TABLE 실행
        console.log('🔧 gemini_quota_events.error_message 컬럼 확대 중...');
        await pool.query(`
            ALTER TABLE gemini_quota_events 
            MODIFY COLUMN error_message MEDIUMTEXT COMMENT '상세 오류 메시지 (스택 트레이스 포함)'
        `);

        console.log('✅ error_message 컬럼을 MEDIUMTEXT로 확대 완료!\n');
        console.log('📊 이제 더 긴 에러 스택 트레이스를 저장할 수 있습니다.');
        console.log('   - 기존: TEXT (최대 64KB)');
        console.log('   - 변경: MEDIUMTEXT (최대 16MB)');
        console.log('\n================================================================================');
        console.log('✅ 완료!');
        console.log('================================================================================');

        await pool.end();
        process.exit(0);

    } catch (error) {
        console.error('❌ 오류 발생:', error.message);
        process.exit(1);
    }
}

upgradeErrorField();

