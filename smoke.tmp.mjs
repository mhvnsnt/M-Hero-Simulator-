import { chromium } from 'playwright';
const browser = await chromium.launch({
  executablePath: '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell',
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox']
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + String(e.message || e).slice(0,400)));
page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0,300)); });
await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' });
await page.waitForTimeout(8000);
console.log('ERRORS:', JSON.stringify(errors.slice(0,12), null, 1));
try { await page.screenshot({ path: '/tmp/mhero-fixed.png', timeout: 15000 }); console.log('shot ok'); }
catch (e) { console.log('shot failed:', String(e).slice(0,120)); }
await browser.close();
