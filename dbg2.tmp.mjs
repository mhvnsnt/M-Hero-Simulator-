import { chromium } from 'playwright';
const browser = await chromium.launch({
  executablePath: '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell',
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox']
});
const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
const errs = [];
page.on('console', m => { if (m.type()==='error') errs.push(m.text().slice(0,3000)); });
await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' });
await page.waitForTimeout(9000);
console.log('ERRS:', JSON.stringify(errs.slice(0,3), null, 1).slice(0, 2500));
await browser.close();
