/**
 * 로그인 API 테스트 스크립트
 * 실행: node test_login.js
 */
const https = require('https');
const http = require('http');

const BODY = JSON.stringify({ username: 'admin', password: '!test123' });

function request(url, options, body) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.request(url, options, (res) => {
      let data = '';
      res.on('data', (ch) => (data += ch));
      res.on('end', () => resolve({ statusCode: res.statusCode, data }));
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('Timeout')); });
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  const agent = new https.Agent({ rejectUnauthorized: false });
  const opts = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(BODY) },
    agent
  };

  console.log('=== 로그인 API 테스트 (admin / !test123) ===\n');

  try {
    const r = await request('https://localhost:32578/api/auth/login', opts, BODY);
    console.log('HTTP 상태:', r.statusCode);
    console.log('응답:', r.data);
    if (r.statusCode === 200) {
      const j = JSON.parse(r.data);
      if (j.token) console.log('\n✅ 로그인 성공');
      else console.log('\n⚠️ 토큰 없음:', j);
    } else {
      console.log('\n❌ 로그인 실패');
    }
  } catch (e) {
    console.log('❌ 에러:', e.message);
  }
}

main();
