/**
 * ai_analyzer.log 기준 오늘 성공 건수 백필
 * 로그: 8건 DB 저장 완료, gemini_quota_usage에는 2건만 기록됨 → 6건 보정
 * 실행: cd web && node backfill_quota_success.js
 */
const path = require('path');
const mysql = require('mysql2/promise');

async function main() {
  const config = require(path.join(__dirname, '..', 'config.json'));
  const conn = await mysql.createConnection(config.database);
  
  const now = new Date();
  const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  const today = koreaTime.toISOString().split('T')[0];
  
  const [rows] = await conn.query(`
    SELECT gqu.id, ga.account_name, gqu.success_count, gqu.request_count
    FROM gemini_quota_usage gqu
    JOIN gemini_accounts ga ON ga.id = gqu.account_id
    WHERE gqu.usage_date = ?
  `, [today]);
  
  const totalSuccess = rows.reduce((s, r) => s + (r.success_count || 0), 0);
  const ADD_COUNT = 6;
  
  if (totalSuccess >= 8) {
    console.log('이미 8건 이상 기록됨. 백필 불필요.');
    await conn.end();
    return;
  }
  
  const target = rows.find(r => r.success_count > 0) || rows[0];
  if (!target) {
    console.log('오늘 사용량 레코드 없음.');
    await conn.end();
    return;
  }
  
  await conn.query(`
    UPDATE gemini_quota_usage 
    SET success_count = success_count + ?,
        request_count = request_count + ?,
        last_used_at = NOW(),
        updated_at = NOW()
    WHERE id = ?
  `, [ADD_COUNT, ADD_COUNT, target.id]);
  
  console.log(`백필 완료: ${target.account_name} success_count +${ADD_COUNT} (${target.success_count} → ${target.success_count + ADD_COUNT})`);
  await conn.end();
}

main().catch(e => { console.error(e); process.exit(1); });
