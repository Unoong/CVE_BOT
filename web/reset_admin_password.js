/**
 * Admin 비밀번호 재설정 스크립트
 * 사용법: node reset_admin_password.js [새비밀번호]
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const readline = require('readline');

// DB 설정 (server.js에서 가져옴)
const DB_CONFIG = {
    host: '192.168.0.11',
    port: 7777,
    user: 'kakaotalk',
    password: '!Qhdks0123',
    database: 'TOTORO',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

async function resetAdminPassword(newPassword) {
    const pool = mysql.createPool(DB_CONFIG);
    
    try {
        console.log('========================================');
        console.log('  Admin 비밀번호 재설정');
        console.log('========================================');
        console.log('');
        
        // 1. 비밀번호 해시 생성
        console.log('1. 비밀번호 해시 생성 중...');
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        console.log('   ✅ 해시 생성 완료');
        console.log('');
        
        // 2. admin 계정 확인
        console.log('2. admin 계정 확인 중...');
        const [users] = await pool.query('SELECT id, username FROM users WHERE username = ?', ['admin']);
        
        if (users.length === 0) {
            console.log('   ⚠️  admin 계정이 없습니다. 새로 생성합니다...');
            await pool.query(
                'INSERT INTO users (username, password, name, email, role) VALUES (?, ?, ?, ?, ?)',
                ['admin', hashedPassword, '관리자', 'admin@cvebot.com', 'admin']
            );
            console.log('   ✅ admin 계정 생성 완료');
        } else {
            console.log('   ✅ admin 계정 발견 (ID: ' + users[0].id + ')');
            console.log('');
            
            // 3. 비밀번호 업데이트
            console.log('3. 비밀번호 업데이트 중...');
            await pool.query('UPDATE users SET password = ? WHERE username = ?', [hashedPassword, 'admin']);
            console.log('   ✅ 비밀번호 업데이트 완료');
        }
        
        console.log('');
        console.log('========================================');
        console.log('✅ 비밀번호 재설정 완료!');
        console.log('========================================');
        console.log('');
        console.log('로그인 정보:');
        console.log('  ID: admin');
        console.log('  PW: ' + newPassword);
        console.log('');
        
    } catch (error) {
        console.error('❌ 오류 발생:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// 명령줄 인수 또는 입력 받기
const newPassword = process.argv[2];

if (newPassword) {
    resetAdminPassword(newPassword);
} else {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    rl.question('새 비밀번호를 입력하세요: ', (password) => {
        if (!password) {
            console.log('❌ 비밀번호를 입력해주세요.');
            process.exit(1);
        }
        resetAdminPassword(password).then(() => {
            rl.close();
        });
    });
}
