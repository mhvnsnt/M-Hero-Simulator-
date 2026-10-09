import { chromium } from 'playwright';
const browser = await chromium.launch({
  executablePath: '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell',
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox']
});
for (let run = 0; run < 4; run++) {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  const logs = [];
  page.on('console', m => {
    const t = m.text();
    if (t.includes('[DBG]') || (m.type()==='error' && t.includes('Physics step'))) logs.push(t.slice(0,120));
  });
  await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(16000);
  console.log(`RUN ${run}:`, JSON.stringify(logs));
  await page.close();
}
await browser.close();
