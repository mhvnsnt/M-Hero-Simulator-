import { chromium } from 'playwright';
const browser = await chromium.launch({
  executablePath: '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell',
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox']
});
for (let run = 0; run < 3; run++) {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  const errs = [];
  page.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
  await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(14000);
  const phys = errs.find(e => e.includes('Physics step'));
  console.log(`RUN ${run}: ${errs.length} errors${phys ? ' *** PHYSICS TRAP ***' : ''}`);
  if (phys) console.log(phys.slice(0, 1800));
  await page.close();
}
await browser.close();
