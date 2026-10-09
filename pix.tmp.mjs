import { chromium } from 'playwright';
const browser = await chromium.launch({
  executablePath: '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell',
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox']
});
const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' });
await page.waitForTimeout(8000);
const stats = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  if (!c) return { canvas: false };
  const gl = c.getContext('webgl2') || c.getContext('webgl');
  if (!gl) return { canvas: true, gl: false };
  const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
  const px = new Uint8Array(64 * 64 * 4);
  gl.readPixels(Math.floor(w/2)-32, Math.floor(h/2)-32, 64, 64, gl.RGBA, gl.UNSIGNED_BYTE, px);
  let nonBlack = 0;
  for (let i = 0; i < px.length; i += 4) { if (px[i] + px[i+1] + px[i+2] > 12) nonBlack++; }
  return { canvas: true, gl: true, w, h, nonBlack, total: 64*64 };
});
console.log('PIX:', JSON.stringify(stats));
console.log('HUD:', await page.evaluate(() => document.body.innerText.slice(0,120).replace(/\n/g,' | ')));
await browser.close();
