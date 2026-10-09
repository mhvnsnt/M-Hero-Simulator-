import { chromium } from 'playwright';
const browser = await chromium.launch({
  executablePath: '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell',
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox']
});
const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
const errs = [];
page.on('pageerror', e => errs.push('PAGEERROR: ' + String(e.message||e).slice(0,200)));
page.on('console', m => { if (m.type()==='error'||m.type()==='warning') errs.push(m.type().toUpperCase()+': '+m.text().slice(0,200)); });
await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' });
await page.waitForTimeout(9000);
const info = await page.evaluate(() => {
  const cs = [...document.querySelectorAll('canvas')];
  return cs.map(c => {
    const r = c.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y), dw: c.width, dh: c.height };
  });
});
console.log('CANVASES:', JSON.stringify(info));
console.log('ERRS:', JSON.stringify(errs.slice(0,8)));
await browser.close();
