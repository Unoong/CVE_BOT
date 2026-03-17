/**
 * 대시보드 로딩 성능 측정 - Playwright로 API 요청별 소요 시간 확인
 */
const { chromium } = require('playwright');

(async () => {
  const timings = {};
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ ignoreHTTPSErrors: true });

    // 네트워크 요청 타이밍 수집
    const getApiPath = (url) => {
      const m = url.match(/\/api(\/[^?]*)/);
      return m ? m[1] : url;
    };
    context.on('request', (req) => {
      const url = req.url();
      if (url.includes('/api/')) {
        const key = getApiPath(url);
        if (!timings[key]) timings[key] = [];
        timings[key].push({ start: Date.now(), url });
      }
    });
    context.on('response', async (res) => {
      const url = res.request().url();
      if (url.includes('/api/')) {
        const key = getApiPath(url);
        const arr = timings[key];
        if (arr && arr.length > 0) {
          // 첫 번째 미완료 요청에 매칭 (동일 경로 다중 요청 시)
          const req = arr.find((r) => r.duration == null);
          if (req) {
            req.duration = Date.now() - req.start;
            req.status = res.status();
          }
        }
      }
    });

    const page = await context.newPage();

    // 로그인 페이지인지 확인 후 로그인
    await page.goto('https://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(1500);

    const isLoginPage = await page.locator('input[name="username"], input[type="text"]').count() > 0;
    if (isLoginPage) {
      await page.fill('input[name="username"], input[type="text"]', 'admin');
      await page.fill('input[name="password"], input[type="password"]', '!test123');
      await page.click('button[type="submit"], button:has-text("로그인")');
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(2000);
    }

    // 대시보드로 이동 (새로고침으로 깨끗한 측정)
    const navStart = Date.now();
    let statsReqTime = null;
    let statsResTime = null;
    page.on('request', (req) => {
      if (req.url().includes('/api/dashboard/stats')) statsReqTime = statsReqTime || Date.now();
    });
    const statsPromise = page.waitForResponse(
      (res) => res.url().includes('/api/dashboard/stats') && res.status() === 200,
      { timeout: 60000 }
    ).then((res) => { statsResTime = Date.now(); return res; }).catch((e) => null);

    await page.goto('https://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });

    // "통계 로딩중" 사라질 때까지 대기
    try {
      await page.waitForSelector('text=통계 로딩중', { state: 'visible', timeout: 3000 }).catch(() => null);
      await page.waitForSelector('text=통계 로딩중', { state: 'hidden', timeout: 60000 });
    } catch (e) {
      // 이미 로딩 완료됐을 수 있음
    }
    const totalLoadMs = Date.now() - navStart;
    await statsPromise;
    await page.waitForTimeout(2000); // 추가 요청 완료 대기

    const statsApiMs = (statsReqTime && statsResTime) ? statsResTime - statsReqTime : null;

    // 결과 출력
    console.log('\n========== 대시보드 로딩 측정 결과 ==========\n');
    console.log(`전체 로딩 시간(통계 로딩중 해제까지): ${totalLoadMs}ms`);
    if (statsApiMs != null) console.log(`/api/dashboard/stats API 소요: ${statsApiMs}ms`);
    console.log('');

    const apiTimings = [];
    for (const [path, arr] of Object.entries(timings)) {
      for (const t of arr) {
        if (t.duration != null) {
          apiTimings.push({ path: path || '(root)', duration: t.duration, status: t.status });
        }
      }
    }
    apiTimings.sort((a, b) => b.duration - a.duration);

    console.log('API 요청별 소요 시간 (느린 순):');
    console.log('--------------------------------');
    apiTimings.forEach((t, i) => {
      const slow = t.duration > 3000 ? ' << 느림' : '';
      console.log(`  ${i + 1}. ${t.path}: ${t.duration}ms (${t.status})${slow}`);
    });

    // 대시보드 관련 API만 필터
    const dashboardApis = apiTimings.filter(t =>
      t.path.includes('dashboard') || t.path.includes('gemini/quota')
    );
    if (dashboardApis.length > 0) {
      const slowest = dashboardApis[0];
      console.log(`\n가장 느린 대시보드 API: ${slowest.path} (${slowest.duration}ms)`);
    }

    // 스크린샷 저장
    await page.screenshot({ path: 'c:\\aiserver\\CVE_BOT\\.playwright-mcp\\dashboard-load-result.png', fullPage: true });
    console.log('\n스크린샷: .playwright-mcp/dashboard-load-result.png');

  } catch (err) {
    console.error('오류:', err.message);
  } finally {
    if (browser) await browser.close();
  }
})();
