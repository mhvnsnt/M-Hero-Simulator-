import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
const browser = await chromium.launch({
  executablePath: '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell',
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox']
});
const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + String(e.message || e).slice(0,200)));
await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' });
await page.waitForTimeout(12000); // let RobotExpressive.glb load onto P2 (1s timer + fetch)
console.log('ERRORS:', JSON.stringify(errors));
const dataUrl = await page.evaluate(() => new Promise(res => {
  const src = document.querySelector('canvas');
  const gl = src.getContext('webgl2') || src.getContext('webgl');
  requestAnimationFrame(() => {
    const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
    const px = new Uint8Array(w*h*4);
    gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,px);
    let nonBlack=0,total=0;
    for (let y=0;y<h;y+=8) for (let x=0;x<w;x+=8){ const i=(y*w+x)*4; total++; if(px[i]+px[i+1]+px[i+2]>30) nonBlack++; }
    const out = document.createElement('canvas'); out.width=w; out.height=h;
    const ctx = out.getContext('2d');
    const img = ctx.createImageData(w,h);
    for (let y=0;y<h;y++){ const s=(h-1-y)*w*4, d=y*w*4; img.data.set(px.subarray(s,s+w*4), d); }
    ctx.putImageData(img,0,0);
    res({ url: out.toDataURL('image/png'), nonBlack, total, w, h });
  });
}));
writeFileSync('/tmp/mhero-viewport.png', Buffer.from(dataUrl.url.split(',')[1], 'base64'));
console.log('FRAME:', JSON.stringify({nonBlack:dataUrl.nonBlack,total:dataUrl.total,w:dataUrl.w,h:dataUrl.h}));
await browser.close();
