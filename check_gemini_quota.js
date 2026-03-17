/**
 * Playwright로 gemini-quota 페이지 접속 및 시간 표시 검증
 * - 로그인 필요 시 admin / !test123
 * - 마지막 사용, 소진 시각 텍스트 추출
 * - KST(UTC+9) 표시 여부 확인
 */
const { chromium } = require('playwright');

async function main() {
  // HTTPS 먼저 시도 (프론트엔드가 HTTPS로 서비스되는 경우)
  const baseUrl = process.env.URL || 'https://localhost:3000';
  const url = `${baseUrl}/gemini-quota`;

  console.log('=== Gemini Quota 페이지 검증 ===');
  console.log('URL:', url);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
  });

  try {
    const page = await context.newPage();

    // 1. 페이지 접속
    console.log('\n1. 페이지 접속 중...');
    let response = await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });

    // 로그인 페이지인지 확인
    const pageTitle = await page.title();
    const currentUrl = page.url();
    const bodyText = await page.textContent('body');

    if (
      bodyText.includes('로그인') ||
      bodyText.includes('Login') ||
      currentUrl.includes('login') ||
      currentUrl.includes('login')
    ) {
      console.log('   로그인 페이지 감지. 로그인 시도 (admin / !test123)...');
      await page.fill('input[name="username"], input[name="id"], input[type="text"]', 'admin');
      await page.fill('input[name="password"], input[type="password"]', '!test123');
      await page.click('button[type="submit"], input[type="submit"], button:has-text("로그인")');
      await page.waitForLoadState('networkidle');
      console.log('   로그인 후 gemini-quota로 이동...');
      await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    }

    // 2. 데이터 로딩 대기
    await page.waitForTimeout(3000);

    // 3. 페이지 텍스트 추출
    const fullText = await page.textContent('body');
    console.log('\n2. 페이지 텍스트 추출 완료');

    // 전체 요청/성공/실패 카드 확인
    const totalReqMatch = fullText.match(/전체\s*요청[\s\S]*?(\d+)/);
    const successFailMatch = fullText.match(/성공:\s*(\d+)\s*\|\s*실패:\s*(\d+)/);
    console.log('\n--- 금일 분석 건수 ---');
    console.log('전체 요청:', totalReqMatch ? totalReqMatch[1] : '(미검출)');
    if (successFailMatch) {
      console.log('성공:', successFailMatch[1], '| 실패:', successFailMatch[2]);
    }

    // 4. 이벤트 로그 탭 클릭 후 시간 확인
    const eventTab = page.locator('button[role="tab"], [role="tab"]').filter({ hasText: '이벤트 로그' });
    if (await eventTab.count() > 0) {
      await eventTab.click();
      await page.waitForTimeout(2000);
      const eventText = await page.textContent('body');
      const timeMatches = eventText.match(/\d{1,2}월\s*\d{1,2}일\s*(오전|오후)\s*\d{1,2}:\d{2}:\d{2}/g);
      console.log('\n--- 이벤트 로그 시간 (최근 3개) ---');
      if (timeMatches && timeMatches.length > 0) {
        timeMatches.slice(0, 3).forEach((t, i) => console.log(`  ${i + 1}. ${t}`));
      } else {
        console.log('  (이벤트 없음 또는 형식 다름)');
      }
    }

    // 6. 마지막 사용, 소진 시각 찾기
    const lastUsedMatch = fullText.match(/마지막\s*사용[:\s]*([^\n]+)/);
    const exhaustedMatch = fullText.match(/소진\s*시각[:\s]*([^\n]+)/);

    const lastUsed = lastUsedMatch ? lastUsedMatch[1].trim() : null;
    const exhausted = exhaustedMatch ? exhaustedMatch[1].trim() : null;

    console.log('\n--- 검출된 시간 ---');
    console.log('마지막 사용:', lastUsed || '(없음)');
    console.log('소진 시각:', exhausted || '(없음)');

    // 7. 스크린샷 저장
    const screenshotPath = 'gemini_quota_screenshot.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('\n스크린샷 저장:', screenshotPath);

    // 8. KST 검증: 오전 5:56 UTC -> 14:56 KST (오후 2:56)
    const isKST = /오후\s*2:56|14:56|오후\s*14:56/.test(fullText);
    const isAM = /오전\s*5:56/.test(fullText);
    const isPM = /오후\s*2:56|14:56/.test(fullText);

    console.log('\n--- KST(UTC+9) 검증 ---');
    if (isAM && !isPM) {
      console.log('결과: 오전 5:56으로 표시됨 -> UTC(또는 로컬)로 보임. KST(14:56)가 아님.');
    } else if (isPM || isKST) {
      console.log('결과: 오후 2:56 또는 14:56으로 표시됨 -> KST(UTC+9) 적용됨.');
    } else {
      console.log('결과: 표시 형식 확인 필요. 추출된 텍스트:', lastUsed, exhausted);
    }

    await browser.close();
    return { lastUsed, exhausted, fullText };
  } catch (err) {
    console.error('오류:', err.message);
    await browser.close();
    return null;
  }
}

main();
