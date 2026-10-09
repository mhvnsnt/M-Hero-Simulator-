import { chromium } from 'playwright';
const browser = await chromium.launch({
  executablePath: '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell',
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-lcd-text']
});
const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' });
await page.waitForTimeout(12000);
try {
  await page.screenshot({ path: '/tmp/mhero-full.png', timeout: 90000 });
  console.log('full shot ok');
} catch (e) { console.log('full shot failed:', String(e).slice(0,100)); }
await browser.close();
