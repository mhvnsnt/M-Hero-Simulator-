import { chromium } from 'playwright';
const browser = await chromium.launch({
  executablePath: '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell',
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox']
});
for (const seed of [1, 7, 42]) {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  await page.addInitScript((s) => {
    let a = s;
    Math.random = function() {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }, seed);
  const logs = [];
  page.on('console', m => {
    const t = m.text();
    if (t.includes('[DBG]') || (m.type()==='error' && t.includes('Physics step'))) logs.push(t.slice(0,100));
  });
  await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(16000);
  console.log(`SEED ${seed}:`, JSON.stringify(logs));
  await page.close();
}
await browser.close();
