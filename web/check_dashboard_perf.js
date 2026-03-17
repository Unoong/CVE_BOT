/**
 * 대시보드 성능 점검: 캐시 테이블/인덱스 확인 및 API 응답 시간 측정
 * 실행: cd web && node check_dashboard_perf.js
 */
const path = require('path');
const mysql = require('mysql2/promise');
const https = require('https');

const config = require(path.join(__dirname, '..', 'config.json'));

async function runQuery(conn, name, sql, params = []) {
  const start = Date.now();
  try {
    await conn.query(sql, params);
    return { name, ms: Date.now() - start, ok: true };
  } catch (e) {
    return { name, ms: Date.now() - start, ok: false, err: e.message };
  }
}

async function main() {
  const conn = await mysql.createConnection(config.database);

  console.log('\n========== 1. 캐시 테이블 데이터 확인 ==========\n');

  const tables = [
    'dashboard_stats_daily',
    'dashboard_cvss_distribution',
    'dashboard_recent_cves',
    'dashboard_recent_pocs',
    'dashboard_latest_cves',
    'dashboard_attack_stage_stats',
    'dashboard_cwe_stats',
    'dashboard_attack_type_stats',
    'dashboard_product_stats',
  ];

  for (const t of tables) {
    const [rows] = await conn.query(`SELECT COUNT(*) as cnt FROM ${t}`);
    const [latest] = await conn.query(`SELECT MAX(stat_date) as d FROM ${t}`).catch(() => [{ d: null }]);
    console.log(`  ${t}: ${rows[0].cnt}건, 최신 stat_date: ${latest[0]?.d || '-'}`);
  }

  console.log('\n========== 2. 인덱스 확인 ==========\n');

  const [indexes] = await conn.query(`
    SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME LIKE 'dashboard_%'
    ORDER BY TABLE_NAME, INDEX_NAME
  `);
  const byTable = {};
  for (const r of indexes) {
    if (!byTable[r.TABLE_NAME]) byTable[r.TABLE_NAME] = [];
    byTable[r.TABLE_NAME].push(`${r.INDEX_NAME}(${r.COLUMN_NAME})`);
  }
  for (const [t, idxs] of Object.entries(byTable)) {
    console.log(`  ${t}: ${[...new Set(idxs.map(i => i.split('(')[0]))].join(', ')}`);
  }

  console.log('\n========== 3. 대시보드 stats API 쿼리별 소요 시간 ==========\n');

  const [[basicStats]] = await conn.query('SELECT * FROM dashboard_stats_daily ORDER BY stat_date DESC LIMIT 1');
  const statDate = basicStats?.stat_date instanceof Date
    ? basicStats.stat_date.toISOString().split('T')[0]
    : basicStats?.stat_date;

  if (!statDate) {
    console.log('  ⚠️ dashboard_stats_daily 비어있음 → init_dashboard_stats.js 실행 필요\n');
  } else {
    const queries = [
      ['dashboard_stats_daily', 'SELECT * FROM dashboard_stats_daily ORDER BY stat_date DESC LIMIT 1'],
      ['dashboard_cvss_distribution (stat_date)', 'SELECT severity, count FROM dashboard_cvss_distribution WHERE stat_date = ?', [statDate]],
      ['dashboard_cvss_distribution (MAX fallback)', 'SELECT severity, count FROM dashboard_cvss_distribution WHERE stat_date = (SELECT MAX(stat_date) FROM dashboard_cvss_distribution) ORDER BY FIELD(severity, \'CRITICAL\', \'HIGH\', \'MEDIUM\', \'LOW\')'],
      ['dashboard_recent_cves', 'SELECT * FROM dashboard_recent_cves WHERE stat_date = ? ORDER BY rank_order ASC LIMIT 10', [statDate]],
      ['dashboard_recent_cves (fallback)', 'SELECT CVE_Code, product, collect_time FROM CVE_Info WHERE collect_time IS NOT NULL ORDER BY collect_time DESC LIMIT 10'],
      ['dashboard_recent_pocs', 'SELECT * FROM dashboard_recent_pocs WHERE stat_date = ? ORDER BY rank_order ASC LIMIT 10', [statDate]],
      ['dashboard_recent_pocs (fallback)', 'SELECT id, title, writer, cve, collect_time FROM Github_CVE_Info WHERE collect_time IS NOT NULL ORDER BY collect_time DESC LIMIT 10'],
      ['dashboard_latest_cves', 'SELECT * FROM dashboard_latest_cves WHERE stat_date = ? ORDER BY rank_order ASC LIMIT 10', [statDate]],
      ['dashboard_latest_cves (fallback)', 'SELECT CVE_Code, product, datePublished FROM CVE_Info WHERE datePublished IS NOT NULL ORDER BY datePublished DESC LIMIT 10'],
      ['dashboard_attack_stage_stats', 'SELECT vuln_stage, count FROM dashboard_attack_stage_stats WHERE stat_date = ? ORDER BY rank_order ASC LIMIT 100', [statDate]],
      ['dashboard_cwe_stats', 'SELECT cwe_id, count FROM dashboard_cwe_stats WHERE stat_date = ? ORDER BY rank_order ASC LIMIT 100', [statDate]],
      ['dashboard_attack_type_stats', 'SELECT attack_type, count FROM dashboard_attack_type_stats WHERE stat_date = ? ORDER BY rank_order ASC LIMIT 100', [statDate]],
      ['dashboard_product_stats', 'SELECT product, count FROM dashboard_product_stats WHERE stat_date = ? ORDER BY rank_order ASC LIMIT 100', [statDate]],
    ];

    for (const [name, sql, params = []] of queries) {
      const r = await runQuery(conn, name, sql, params);
      const mark = r.ms > 1000 ? ' << 느림' : '';
      console.log(`  ${r.name}: ${r.ms}ms${mark}${r.ok ? '' : ' (실패)'}`);
    }
  }

  console.log('\n========== 4. collection-trends 쿼리 소요 시간 ==========\n');

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const startDate = thirtyDaysAgo.toISOString().split('T')[0];
  const ctQueries = [
    ['CVE_Info (collect_time)', 'SELECT DATE(collect_time) as date, COUNT(*) as count FROM CVE_Info WHERE collect_time >= ? AND collect_time IS NOT NULL GROUP BY DATE(collect_time)', [startDate]],
    ['Github_CVE_Info (collect_time)', 'SELECT DATE(collect_time) as date, COUNT(*) as count FROM Github_CVE_Info WHERE collect_time >= ? AND collect_time IS NOT NULL GROUP BY DATE(collect_time)', [startDate]],
    ['Github_CVE_Info (AI_chk)', 'SELECT DATE(collect_time) as date, COUNT(*) as count FROM Github_CVE_Info WHERE collect_time >= ? AND collect_time IS NOT NULL AND AI_chk = ? GROUP BY DATE(collect_time)', [startDate, 'Y']],
  ];
  for (const [name, sql, params] of ctQueries) {
    const r = await runQuery(conn, name, sql, params);
    const mark = r.ms > 1000 ? ' << 느림' : '';
    console.log(`  ${r.name}: ${r.ms}ms${mark}${r.ok ? '' : ' (실패)'}`);
  }

  console.log('\n========== 5. API 응답 시간 ==========\n');

  const apiStart = Date.now();
  await new Promise((resolve, reject) => {
    const req = https.get('https://localhost:3000/api/dashboard/stats', { rejectUnauthorized: false }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve(body));
    });
    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('timeout')); });
  });
  const apiMs = Date.now() - apiStart;
  console.log(`  /api/dashboard/stats: ${apiMs}ms${apiMs > 3000 ? ' << 느림' : ''}`);

  const ctApiStart = Date.now();
  await new Promise((resolve, reject) => {
    const req = https.get('https://localhost:3000/api/dashboard/collection-trends', { rejectUnauthorized: false }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve(body));
    });
    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('timeout')); });
  });
  const ctApiMs = Date.now() - ctApiStart;
  console.log(`  /api/dashboard/collection-trends: ${ctApiMs}ms${ctApiMs > 3000 ? ' << 느림' : ''}`);

  console.log('\n========== 6. 권장 조치 ==========\n');
  const [sd] = await conn.query('SELECT COUNT(*) as c FROM dashboard_stats_daily');
  const [rc] = await conn.query('SELECT COUNT(*) as c FROM dashboard_recent_cves');
  if (sd[0].c === 0 || rc[0].c === 0) {
    console.log('  → node init_dashboard_stats.js 실행하여 캐시 테이블 채우기');
  }
  console.log('  → node optimize_dashboard_tables.sql 인덱스 적용 확인');
  console.log('');

  await conn.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
