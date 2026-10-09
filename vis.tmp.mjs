import { chromium } from 'playwright';
const browser = await chromium.launch({
  executablePath: '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell',
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox']
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errs = [];
page.on('pageerror', e => errs.push('PAGEERROR: ' + String(e.message||e).slice(0,200)));
page.on('console', m => { if (m.type()==='error') errs.push('CERR: ' + m.text().slice(0,150)); });
await page.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(12000);
// Freeze the loop so the compositor can produce a stable screenshot frame.
await page.evaluate(() => { window.__mhero.active = false; });
await page.waitForTimeout(1500);
console.log('ERRORS:', JSON.stringify(errs.slice(0,6)));
try { await page.screenshot({ path: '/home/hatch/workspace/agent-ops/mhero-qc/boot-verify.png', timeout: 60000 }); console.log('shot ok'); }
catch (e) { console.log('shot timeout'); }
await browser.close();
