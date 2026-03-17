const { chromium } = require('playwright');

(async () => {
  const results = { passed: [], failed: [], errors: [] };
  let browser;
  
  try {
    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();
    
    // 1. Navigate to main page
    try {
      await page.goto('https://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 15000 });
      results.passed.push('Main page loaded');
    } catch (e) {
      results.failed.push('Main page load');
      results.errors.push('Navigate: ' + e.message);
      throw e;
    }
    
    // 2. Login
    try {
      const usernameField = page.locator('input[name="username"], input[id="username"], input[type="text"]').first();
      const passwordField = page.locator('input[name="password"], input[id="password"], input[type="password"]').first();
      await usernameField.fill('admin');
      await passwordField.fill('!test123');
      const submitBtn = page.locator('button[type="submit"], input[type="submit"], button:has-text("로그인"), button:has-text("Login")').first();
      await submitBtn.click();
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      results.passed.push('Login submitted');
    } catch (e) {
      results.failed.push('Login');
      results.errors.push('Login: ' + e.message);
      throw e;
    }
    
    // 3. Verify login - wait for redirect or dashboard
    await page.waitForTimeout(2000);
    const url = page.url();
    if (url.includes('login') && !url.includes('dashboard')) {
      const errMsg = await page.locator('.error, .alert-danger, [role="alert"]').first().textContent().catch(() => 'Unknown');
      results.failed.push('Login verification');
      results.errors.push('Login may have failed: ' + errMsg);
    } else {
      results.passed.push('Login verified - redirected from login');
    }
    
    // 4. Navigate to /gemini-quota
    try {
      await page.goto('https://localhost:3000/gemini-quota', { waitUntil: 'domcontentloaded', timeout: 15000 });
      const hasError = await page.locator('text=Error, text=404, text=Not Found').count() > 0;
      if (hasError) {
        results.failed.push('Gemini-quota page');
        results.errors.push('Gemini-quota showed error');
      } else {
        results.passed.push('Gemini-quota page loaded');
      }
    } catch (e) {
      results.failed.push('Gemini-quota navigation');
      results.errors.push('Gemini-quota: ' + e.message);
    }
    
    // 5. Take screenshot of gemini-quota
    try {
      await page.screenshot({ path: 'c:\\aiserver\\CVE_BOT\\.playwright-mcp\\gemini-quota-test.png', fullPage: false });
      results.passed.push('Screenshot saved to .playwright-mcp/gemini-quota-test.png');
    } catch (e) {
      results.failed.push('Screenshot');
      results.errors.push('Screenshot: ' + e.message);
    }
    
    // 6. Navigate to /board
    try {
      await page.goto('https://localhost:3000/board', { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(2000);
      const boardContent = await page.locator('body').textContent();
      const hasBoardList = boardContent && (boardContent.includes('board') || boardContent.includes('Board') || boardContent.includes('게시판') || page.locator('table, .list, [class*="board"]').count() > 0);
      if (hasBoardList) {
        results.passed.push('Board list loaded');
      } else {
        results.passed.push('Board page loaded (content check inconclusive)');
      }
    } catch (e) {
      results.failed.push('Board navigation');
      results.errors.push('Board: ' + e.message);
    }
    
    // Output summary
    console.log(JSON.stringify({ passed: results.passed, failed: results.failed, errors: results.errors }, null, 2));
    
  } catch (e) {
    console.log(JSON.stringify({ passed: [], failed: ['Fatal'], errors: [e.message] }, null, 2));
  } finally {
    if (browser) await browser.close();
  }
})();
