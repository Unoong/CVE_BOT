/**
 * users 테이블 한글 깨짐(???) 수정 스크립트
 * - 테이블 charset을 utf8mb4로 변환
 * - latin1로 잘못 해석된 UTF-8 데이터 복구 시도
 * - admin 계정 name/nickname 기본값 설정
 * 
 * 사용법: node fix_users_charset.js
 */

const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: 'localhost',
  port: 7002,
  user: 'root',
  password: '!db8354',
  database: 'TOTORO',
  charset: 'utf8mb4'
};

async function fixCharset() {
  const pool = mysql.createPool(DB_CONFIG);
  const conn = await pool.getConnection();

  try {
    console.log('========================================');
    console.log('  users 테이블 한글 인코딩 수정');
    console.log('========================================\n');

    // 1. 현재 테이블 charset 확인
    const [tables] = await conn.query(`
      SELECT TABLE_COLLATION 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'TOTORO' AND TABLE_NAME = 'users'
    `);
    console.log('1. 현재 users 테이블 collation:', tables[0]?.TABLE_COLLATION || 'N/A');

    // 2. latin1로 잘못 저장된 UTF-8 데이터 복구 시도 (테이블 변환 전에 수행)
    //    - UTF-8 바이트가 latin1 컬럼에 저장된 경우 CONVERT로 복구 가능
    console.log('\n2. 인코딩 복구 시도 (name, nickname - latin1→utf8mb4)...');
    try {
      await conn.query(`
        UPDATE users SET name = CONVERT(CAST(CONVERT(name USING latin1) AS BINARY) USING utf8mb4)
        WHERE name IS NOT NULL AND name != ''
      `);
      await conn.query(`
        UPDATE users SET nickname = CONVERT(CAST(CONVERT(nickname USING latin1) AS BINARY) USING utf8mb4)
        WHERE nickname IS NOT NULL AND nickname != ''
      `);
      console.log('   ✅ 인코딩 복구 시도 완료');
    } catch (e) {
      console.log('   ⚠️  인코딩 복구 건너뜀:', e.message);
    }

    // 3. 테이블을 utf8mb4로 변환
    console.log('\n3. users 테이블을 utf8mb4로 변환 중...');
    await conn.query(`
      ALTER TABLE users 
      CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    console.log('   ✅ 테이블 charset 변환 완료');

    // 4. admin 계정 name/nickname 기본값 설정 (여전히 ???인 경우)
    console.log('\n4. admin 계정 기본값 설정...');
    const [adminRows] = await conn.query(
      'SELECT id, username, name, nickname FROM users WHERE username = ?',
      ['admin']
    );
    if (adminRows.length > 0) {
      const admin = adminRows[0];
      const needUpdate = 
        !admin.name || admin.name === '???' || /^[?]+$/.test(admin.name) ||
        !admin.nickname || admin.nickname === '???' || /^[?]+$/.test(admin.nickname);
      if (needUpdate) {
        await conn.query(
          'UPDATE users SET name = ?, nickname = ? WHERE username = ?',
          ['관리자', '관리자', 'admin']
        );
        console.log('   ✅ admin 계정 name/nickname을 "관리자"로 설정');
      } else {
        console.log('   ℹ️  admin 계정 데이터 정상');
      }
    }

    // 5. nickname에 ? 포함된 모든 계정 → username으로 대체 (공백+? 혼합 포함)
    console.log('\n5. nickname에 ? 포함된 계정을 username으로 대체...');
    const [r1] = await conn.query(`
      UPDATE users 
      SET nickname = CASE 
        WHEN username NOT LIKE '%?%' THEN username 
        ELSE CONCAT('사용자', id) 
      END
      WHERE nickname LIKE '%?%' OR nickname REGEXP '^[?\\s]+$' OR nickname IS NULL OR nickname = ''
    `);
    console.log(`   ✅ nickname ${r1.affectedRows}개 수정`);

    // 6. name에 ? 포함된 모든 계정 → username 또는 '사용자{id}'로 대체
    console.log('\n6. name에 ? 포함된 계정 수정...');
    const [r2] = await conn.query(`
      UPDATE users 
      SET name = CASE 
        WHEN username NOT LIKE '%?%' THEN username 
        ELSE CONCAT('사용자', id) 
      END
      WHERE name LIKE '%?%' OR name REGEXP '^[?\\s]+$' OR name IS NULL OR name = ''
    `);
    console.log(`   ✅ name ${r2.affectedRows}개 수정`);

    // 7. username이 ?만 있는 계정 → user_{id}로 변경 (로그인용 복구)
    console.log('\n7. username이 ?만 있는 계정 복구...');
    const [r3] = await conn.query(`
      UPDATE users 
      SET username = CONCAT('user_', id)
      WHERE username REGEXP '^[?]+$' OR username LIKE '%?%'
    `);
    if (r3.affectedRows > 0) {
      console.log(`   ✅ username ${r3.affectedRows}개 → user_{id} 형식으로 변경 (비밀번호 재설정 필요)`);
    } else {
      console.log('   ℹ️  수정 대상 없음');
    }

    console.log('\n========================================');
    console.log('✅ 한글 인코딩 수정 완료');
    console.log('========================================\n');

  } catch (err) {
    console.error('❌ 오류:', err.message);
    process.exit(1);
  } finally {
    conn.release();
    await pool.end();
  }
}

fixCharset();
