/**
 * DB 전체 한글 깨짐(???) 수정 스크립트
 * - TOTORO DB 전체 테이블 utf8mb4 변환
 * - latin1로 잘못 저장된 UTF-8 데이터 복구 시도
 * - ? 포함된 텍스트 컬럼 처리
 * 
 * 사용법: node fix_all_db_charset.js
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

// 텍스트 타입 컬럼만 처리 (CHAR, VARCHAR, TEXT, LONGTEXT, MEDIUMTEXT 등)
const TEXT_TYPES = ['char', 'varchar', 'text', 'mediumtext', 'longtext'];

async function getTextColumns(conn, tableName) {
  const [cols] = await conn.query(`
    SELECT COLUMN_NAME, DATA_TYPE 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'TOTORO' 
      AND TABLE_NAME = ?
      AND DATA_TYPE IN (${TEXT_TYPES.map(() => '?').join(',')})
  `, [tableName, ...TEXT_TYPES]);
  return cols.map(c => c.COLUMN_NAME);
}

async function fixAllCharset() {
  const pool = mysql.createPool(DB_CONFIG);
  const conn = await pool.getConnection();

  try {
    console.log('========================================');
    console.log('  DB 전체 한글 인코딩 수정 (TOTORO)');
    console.log('========================================\n');

    // 1. DB charset 변경
    console.log('1. 데이터베이스 utf8mb4 설정...');
    await conn.query(`
      ALTER DATABASE TOTORO 
      CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    console.log('   ✅ 완료\n');

    // 2. 모든 테이블 목록
    const [tables] = await conn.query(`
      SELECT TABLE_NAME FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'TOTORO' AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);

    let totalConverted = 0;
    let totalFixed = 0;

    for (const { TABLE_NAME } of tables) {
      console.log(`\n--- ${TABLE_NAME} ---`);

      try {
        // 2-1. 텍스트 컬럼 latin1→utf8mb4 복구 시도 (ALTER 전에 수행)
        const textCols = await getTextColumns(conn, TABLE_NAME);
        for (const col of textCols) {
          try {
            const [r] = await conn.query(`
              UPDATE \`${TABLE_NAME}\` 
              SET \`${col}\` = CONVERT(CAST(CONVERT(\`${col}\` USING latin1) AS BINARY) USING utf8mb4)
              WHERE \`${col}\` IS NOT NULL AND \`${col}\` != ''
            `);
            if (r.affectedRows > 0) {
              totalFixed += r.affectedRows;
              console.log(`   ✅ ${col}: ${r.affectedRows}행 복구 시도`);
            }
          } catch (e) {
            if (!e.message.includes('Incorrect string value')) {
              console.log(`   ⚠️  ${col}: ${e.message}`);
            }
          }
        }

        // 2-2. 테이블 utf8mb4 변환
        await conn.query(`
          ALTER TABLE \`${TABLE_NAME}\` 
          CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `);
        totalConverted++;
        console.log(`   ✅ charset 변환 완료`);
      } catch (e) {
        console.log(`   ❌ ${e.message}`);
      }
    }

    // 3. Github_CVE_Info ? 포함 컬럼 → cve 또는 '-' fallback
    console.log('\n--- Github_CVE_Info ? 포함 컬럼 처리 ---');
    try {
      const [r1] = await conn.query(`
        UPDATE Github_CVE_Info 
        SET title = CASE WHEN title LIKE '%?%' AND cve IS NOT NULL THEN cve WHEN title LIKE '%?%' THEN '-' ELSE title END
        WHERE title LIKE '%?%'
      `);
      if (r1.affectedRows > 0) console.log(`   ✅ title: ${r1.affectedRows}행`);
      const [r2] = await conn.query(`
        UPDATE Github_CVE_Info SET writer = '-' WHERE writer LIKE '%?%'
      `);
      if (r2.affectedRows > 0) console.log(`   ✅ writer: ${r2.affectedRows}행`);
      const [r3] = await conn.query(`
        UPDATE Github_CVE_Info SET trans_msg = '-' WHERE trans_msg LIKE '%?%'
      `);
      if (r3.affectedRows > 0) console.log(`   ✅ trans_msg: ${r3.affectedRows}행`);
    } catch (e) {
      console.log(`   ⚠️  ${e.message}`);
    }

    // 4. CVE_Info ? 포함 컬럼
    console.log('\n--- CVE_Info ? 포함 컬럼 처리 ---');
    const cveCols = ['product', 'descriptions', 'solutions', 'Attak_Type'];
    for (const col of cveCols) {
      try {
        const [r] = await conn.query(`
          UPDATE CVE_Info 
          SET \`${col}\` = CASE 
            WHEN \`${col}\` LIKE '%?%' AND CVE_Code IS NOT NULL THEN CONCAT('[복구필요] ', CVE_Code)
            WHEN \`${col}\` LIKE '%?%' THEN '-'
            ELSE \`${col}\`
          END
          WHERE \`${col}\` LIKE '%?%'
        `);
        if (r.affectedRows > 0) {
          console.log(`   ✅ ${col}: ${r.affectedRows}행 → fallback 적용`);
        }
      } catch (e) {
        console.log(`   ⚠️  ${col}: ${e.message}`);
      }
    }

    // 5. poc_comments, board_posts content ? 처리
    console.log('\n--- poc_comments, board_posts ? 처리 ---');
    for (const table of ['poc_comments', 'board_posts']) {
      try {
        const [r] = await conn.query(`
          UPDATE \`${table}\` 
          SET content = CASE WHEN content LIKE '%?%' THEN '[삭제된 내용]' ELSE content END
          WHERE content LIKE '%?%'
        `);
        if (r.affectedRows > 0) {
          console.log(`   ✅ ${table}.content: ${r.affectedRows}행`);
        }
      } catch (e) {
        console.log(`   ⚠️  ${table}: ${e.message}`);
      }
    }

    // 6. chat_messages
    console.log('\n--- chat_messages ? 처리 ---');
    for (const col of ['username', 'nickname', 'message']) {
      try {
        const [r] = await conn.query(`
          UPDATE chat_messages 
          SET \`${col}\` = CASE 
            WHEN \`${col}\` LIKE '%?%' THEN '-'
            ELSE \`${col}\`
          END
          WHERE \`${col}\` LIKE '%?%'
        `);
        if (r.affectedRows > 0) {
          console.log(`   ✅ ${col}: ${r.affectedRows}행`);
        }
      } catch (e) {
        console.log(`   ⚠️  ${col}: ${e.message}`);
      }
    }

    console.log('\n========================================');
    console.log(`✅ 테이블 ${totalConverted}개 charset 변환 완료`);
    console.log('========================================\n');

  } catch (err) {
    console.error('❌ 오류:', err.message);
    process.exit(1);
  } finally {
    conn.release();
    await pool.end();
  }
}

fixAllCharset();
