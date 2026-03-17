/**
 * gemini_quota_events에 누락된 성공 이벤트 백필
 * ai_analyzer.log 기준 8건 중 2건만 기록됨 → 6건 추가
 * 실행: cd web && node backfill_quota_events.js
 */
const path = require('path');
const mysql = require('mysql2/promise');

// ai_analyzer.log 기준 8건 - 6개 고유 POC (대시보드 6건) + 요청 8건
const SUCCESS_EVENTS = [
  { cve: 'CVE-2025-66034', link: 'https://github.com/symphony2colour/varlib-cve-2025-66034' },
  { cve: 'CVE-2025-5548', link: 'https://github.com/mk017-hk/CVE-2025-5548' },
  { cve: 'CVE-2025-15276', link: 'https://github.com/ahmedreda38/CVE-2025-15276-poc' },
  { cve: 'CVE-2025-5548', link: 'https://github.com/alfa8sa/CVE-2025-5548' },
  { cve: 'CVE-2025-47273', link: 'https://github.com/ahmedreda38/CVE-2025-47273-PoC' },
  { cve: 'CVE-2026-20660', link: 'https://github.com/retX0/CVE-2026-20660' },
];

async function main() {
  const config = require(path.join(__dirname, '..', 'config.json'));
  const conn = await mysql.createConnection(config.database);

  const now = new Date();
  const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  const today = koreaTime.toISOString().split('T')[0];

  // 오늘 success 이벤트 수
  const [[{ cnt: existing }]] = await conn.query(
    'SELECT COUNT(*) as cnt FROM gemini_quota_events WHERE event_type = ? AND DATE(created_at) = ?',
    ['success', today]
  );

  // account_id (성공 건수가 있는 계정)
  const [[acc]] = await conn.query(
    `SELECT ga.id FROM gemini_accounts ga
     JOIN gemini_quota_usage gqu ON gqu.account_id = ga.id
     WHERE gqu.usage_date = ? AND gqu.success_count > 0 LIMIT 1`,
    [today]
  );
  if (!acc) {
    console.log('오늘 사용량 레코드 없음.');
    await conn.end();
    return;
  }

  const accountId = acc.id;

  // 이미 있는 링크 제외
  const [existingLinks] = await conn.query(
    'SELECT poc_link FROM gemini_quota_events WHERE event_type = ? AND DATE(created_at) = ?',
    ['success', today]
  );
  const existingSet = new Set(existingLinks.map(r => r.poc_link));

  let added = 0;
  const baseTime = new Date(koreaTime.getTime());
  baseTime.setHours(3, 29, 0, 0);

  for (let i = 0; i < SUCCESS_EVENTS.length; i++) {
    const { cve, link } = SUCCESS_EVENTS[i];
    if (existingSet.has(link)) continue;

    const createdAt = new Date(baseTime.getTime() + i * 60 * 60 * 1000);
    await conn.query(
      `INSERT INTO gemini_quota_events (account_id, event_type, cve_code, poc_link, created_at)
       VALUES (?, 'success', ?, ?, ?)`,
      [accountId, cve, link, createdAt]
    );
    added++;
    console.log('추가:', cve, link.slice(0, 50) + '...');
  }

  console.log(`백필 완료: ${added}건 추가 (기존 ${existing}건 → ${existing + added}건)`);
  await conn.end();
}

main().catch(e => { console.error(e); process.exit(1); });
