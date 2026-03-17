/**
 * 로컬 서버 접속 테스트 (프론트 3000, 백엔드 32577)
 * node check_server_access.js
 */
const http = require('http');
const https = require('https');

const urls = [
  { name: '프론트엔드(3000)', url: 'https://localhost:3000', port: 3000, https: true },
  { name: '백엔드(32577)', url: 'http://localhost:32577', port: 32577, https: false }
];

function check(opt) {
  return new Promise((resolve) => {
    const lib = opt.https ? https : http;
    const req = lib.get(opt.url, { timeout: 5000, rejectUnauthorized: false }, (res) => {
      resolve({ ok: true, status: res.statusCode });
    });
    req.on('error', (err) => resolve({ ok: false, err: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, err: 'timeout' }); });
  });
}

(async () => {
  console.log('서버 접속 테스트 (localhost)\n');
  for (const u of urls) {
    const r = await check(u);
    const status = r.ok ? `OK (${r.status})` : `실패: ${r.err || '연결 거부'}`;
    console.log(`  ${u.name}: ${status}`);
  }
  console.log('');
})();
