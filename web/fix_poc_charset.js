/**
 * POC 관련 테이블 한글 깨짐(?) 수정 - 빠른 실행
 * - Github_CVE_Info: title, writer, trans_msg
 * - CVE_Packet_AI_Analysis: cve_summary, vuln_stage, stage_description, remediation 등
 * 사용법: node fix_poc_charset.js
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

async function fix() {
  const pool = mysql.createPool(DB_CONFIG);
  const conn = await pool.getConnection();
  try {
    console.log('=== POC 관련 테이블 ? 수정 ===\n');

    console.log('1. Github_CVE_Info...');
    const [r1] = await conn.query(`UPDATE Github_CVE_Info SET title = COALESCE(NULLIF(TRIM(cve), ''), '-') WHERE title LIKE '%?%'`);
    const [r2] = await conn.query(`UPDATE Github_CVE_Info SET writer = '-' WHERE writer LIKE '%?%'`);
    const [r3] = await conn.query(`UPDATE Github_CVE_Info SET trans_msg = '-' WHERE trans_msg LIKE '%?%'`);
    console.log(`   title: ${r1.affectedRows}, writer: ${r2.affectedRows}, trans_msg: ${r3.affectedRows}\n`);

    console.log('2. CVE_Packet_AI_Analysis (? 문자 제거)...');
    const aiCols = ['cve_summary', 'vuln_stage', 'stage_description', 'packet_text', 'mitre_tactic', 'mitre_technique', 'snort_rule', 'remediation', 'expected_response'];
    let aiTotal = 0;
    for (const col of aiCols) {
      try {
        const [r] = await conn.query(`
          UPDATE CVE_Packet_AI_Analysis 
          SET \`${col}\` = CASE 
            WHEN TRIM(REPLACE(\`${col}\`, '?', '')) = '' THEN '-' 
            ELSE TRIM(REPLACE(\`${col}\`, '?', '')) 
          END
          WHERE \`${col}\` LIKE '%?%'
        `);
        if (r.affectedRows > 0) {
          aiTotal += r.affectedRows;
          console.log(`   ${col}: ${r.affectedRows}행`);
        }
      } catch (e) {
        console.log(`   ${col}: ${e.message}`);
      }
    }
    console.log(`   총 ${aiTotal}행 수정\n`);

    console.log('3. CVE_Packet_AI_Analysis remediation, expected_response (재시도)...');
    try {
      const [r4] = await conn.query(`
        UPDATE CVE_Packet_AI_Analysis SET remediation = CASE WHEN TRIM(REPLACE(remediation, '?', '')) = '' THEN '-' ELSE TRIM(REPLACE(remediation, '?', '')) END WHERE remediation LIKE '%?%'
      `);
      const [r5] = await conn.query(`
        UPDATE CVE_Packet_AI_Analysis SET expected_response = CASE WHEN TRIM(REPLACE(expected_response, '?', '')) = '' THEN '-' ELSE TRIM(REPLACE(expected_response, '?', '')) END WHERE expected_response LIKE '%?%'
      `);
      if (r4.affectedRows > 0 || r5.affectedRows > 0) console.log(`   remediation: ${r4.affectedRows}, expected_response: ${r5.affectedRows}`);
    } catch (e) {
      console.log(`   ⚠️ ${e.message}`);
    }

    console.log('\n완료');
  } finally {
    conn.release();
    await pool.end();
  }
}
fix().catch(e => { console.error(e); process.exit(1); });
