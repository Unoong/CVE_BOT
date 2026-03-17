/**
 * ds-aiplatform.com:3000 접속 테스트 (헤드풀 모드 - 브라우저 표시)
 * 실행: node test_ds_aiplatform.js
 *       node test_ds_aiplatform.js localhost  (로컬 테스트)
 */
const { chromium } = require('playwright');

const useLocal = process.argv.includes('localhost');
const TARGET_URL = useLocal ? 'https://localhost:3000' : 'https://ds-aiplatform.com:3000';
const TIMEOUT = 20000;

(async () => {
  console.log('='.repeat(60));
  console.log('ds-aiplatform.com:3000 접속 테스트 (브라우저 표시)');
  console.log('='.repeat(60));
  console.log('대상:', TARGET_URL);
  console.log('');

  let browser;
  try {
    browser = await chromium.launch({ 
      headless: false,  // 브라우저 창 표시
      slowMo: 100 
    });
    const context = await browser.newContext({ 
      ignoreHTTPSErrors: true,  // 인증서 미발급 시에도 진행
      viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();

    // 1. 메인 페이지 접속
    console.log('[1] 메인 페이지 접속 중...');
    try {
      await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
      console.log('    ✅ 페이지 로드 완료');
    } catch (e) {
      console.log('    ❌ 실패:', e.message);
      console.log('');
      console.log('확인사항:');
      console.log('  - Caddy 실행 중? (caddy run --config Caddyfile)');
      console.log('  - 백엔드(32577), 프론트엔드(3001) 실행 중?');
      console.log('  - ds-aiplatform.com DNS가 이 서버를 가리킴?');
      await page.waitForTimeout(5000);
      await browser.close();
      process.exit(1);
    }

    // 2. 로그인 (admin / !test123)
    console.log('[2] 로그인 시도...');
    try {
      await page.waitForSelector('input[name="username"], input[type="text"]', { timeout: 5000 });
      await page.fill('input[name="username"], input[type="text"]', 'admin');
      await page.fill('input[name="password"], input[type="password"]', '!test123');
      await page.click('button[type="submit"], button:has-text("로그인")');
      await page.waitForTimeout(3000);
      console.log('    ✅ 로그인 완료');
    } catch (e) {
      console.log('    ⚠️ 로그인 단계:', e.message);
    }

    // 3. 대시보드 확인
    console.log('[3] 대시보드 확인...');
    const url = page.url();
    if (url.includes('dashboard') || url.includes('/') && !url.includes('login')) {
      console.log('    ✅ 페이지 로드 성공');
    } else {
      console.log('    현재 URL:', url);
    }

    console.log('');
    console.log('테스트 완료. 브라우저를 5초 후 종료합니다...');
    await page.waitForTimeout(5000);

  } catch (e) {
    console.error('오류:', e.message);
  } finally {
    if (browser) await browser.close();
  }
})();
