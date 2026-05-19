// capture.js — Frame-by-frame export of the Aussies Stats lower-third animation.
// Spins up a local HTTP server, opens export.html in headless Chrome via Puppeteer,
// steps through every frame by updating React state (no page reloads), saves
// transparent PNG frames, then calls ffmpeg to assemble:
//   - aussies-stats.mov  (QuickTime Animation / QTRLE, ARGB — true alpha, universal)
//   - aussies-stats-prores.mov  (ProRes 4444, yuva — for professional NLEs)
//
// TRUE ALPHA NOTE:
//   QuickTime Animation (QTRLE) stores raw ARGB pixels with RLE compression.
//   This format is universally recognised as alpha-capable by every NLE, compositor
//   and player that supports QuickTime alpha.  ProRes 4444 also has alpha but some
//   applications need "Interpret Footage → Straight Alpha" set manually.

const puppeteer    = require('puppeteer');
const http         = require('http');
const fs           = require('fs');
const path         = require('path');
const { execSync } = require('child_process');

const DURATION     = 7.0;
const FPS          = 50;
const TOTAL_FRAMES = Math.round(DURATION * FPS); // 350
const PORT         = 8787;
const FRAMES_DIR   = path.join(__dirname, 'frames');
const OUTPUT_QTRLE  = path.join(__dirname, 'aussies-stats.mov');
const OUTPUT_PRORES = path.join(__dirname, 'aussies-stats-prores4444.mov');

// Tiny static file server so Puppeteer can load the page + vendor scripts.
const server = http.createServer((req, res) => {
  const filePath = path.join(__dirname, decodeURIComponent(req.url.split('?')[0]).slice(1));
  try {
    const content = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mime = {
      '.html': 'text/html; charset=utf-8',
      '.js':   'text/javascript',
      '.jsx':  'text/javascript',
      '.png':  'image/png',
    };
    res.writeHead(200, { 'Content-Type': mime[ext] || 'text/plain' });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});

async function main() {
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`\nStatic server → http://localhost:${PORT}`);

  fs.mkdirSync(FRAMES_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: '/root/.cache/puppeteer/chrome/linux-148.0.7778.167/chrome-linux64/chrome',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
    headless: true,
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

  // Force transparent compositor background so all screenshots have real alpha.
  const client = await page.createCDPSession();
  await client.send('Emulation.setDefaultBackgroundColorOverride', {
    color: { r: 0, g: 0, b: 0, a: 0 },
  });

  console.log('Loading export.html…');
  await page.goto(`http://localhost:${PORT}/export.html`, {
    waitUntil: 'networkidle2',
    timeout: 30000,
  });
  await page.waitForFunction(() => window.__ready === true, { timeout: 15000 });
  console.log(`React ready. Capturing ${TOTAL_FRAMES} frames (${DURATION}s @ ${FPS}fps)…\n`);

  const t0 = Date.now();

  for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
    const t = frame / FPS;

    // Update React state to the target time; wait two animation frames so
    // all effects and layout have settled before screenshotting.
    await page.evaluate((time) => {
      return new Promise((resolve) => {
        window.__setTime(time);
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      });
    }, t);

    const framePath = path.join(FRAMES_DIR, `frame_${String(frame).padStart(4, '0')}.png`);

    // omitBackground:true is belt-and-suspenders with the CDP background override above.
    await page.screenshot({ path: framePath, omitBackground: true });

    if (frame % 25 === 0 || frame === TOTAL_FRAMES - 1) {
      const pct = Math.round(((frame + 1) / TOTAL_FRAMES) * 100);
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      process.stdout.write(`\r  [${pct.toString().padStart(3)}%] frame ${String(frame + 1).padStart(3)}/${TOTAL_FRAMES}  t=${t.toFixed(2)}s  ${elapsed}s elapsed`);
    }
  }

  const captureTime = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n\n✓ ${TOTAL_FRAMES} frames captured in ${captureTime}s\n`);

  await browser.close();
  server.close();

  const frameGlob = path.join(FRAMES_DIR, 'frame_%04d.png');

  // ── Primary: QuickTime Animation (QTRLE) with ARGB ──────────────────────────
  // ARGB pixel format gives raw RGBA data — zero ambiguity about alpha presence.
  // Every NLE/compositor on Mac and PC reads this as a true alpha track.
  console.log('Encoding QuickTime Animation (QTRLE + ARGB) — true alpha…');
  execSync(
    [
      'ffmpeg -y',
      `-framerate ${FPS}`,
      `-i "${frameGlob}"`,
      '-c:v qtrle',
      '-pix_fmt argb',   // 32-bit ARGB = true alpha, no colour-space ambiguity
      `"${OUTPUT_QTRLE}"`,
    ].join(' '),
    { stdio: 'inherit' }
  );

  // ── Secondary: ProRes 4444 ───────────────────────────────────────────────────
  // Better quality/size ratio for professional NLEs; requires setting
  // "Interpret Footage → Straight Alpha" in AE or Premiere on first import.
  console.log('\nEncoding ProRes 4444 (yuva444p, secondary)…');
  execSync(
    [
      'ffmpeg -y',
      `-framerate ${FPS}`,
      `-i "${frameGlob}"`,
      '-c:v prores_ks',
      '-profile:v 4',
      '-pix_fmt yuva444p10le',
      '-alpha_bits 16',
      '-vendor apl0',
      `"${OUTPUT_PRORES}"`,
    ].join(' '),
    { stdio: 'inherit' }
  );

  // ── Verify: composite QTRLE over a coloured background ──────────────────────
  console.log('\nVerifying alpha channel (compositing over magenta)…');
  execSync(
    [
      'ffmpeg -y',
      '-f lavfi -i color=c=magenta:size=1920x1080:rate=50',
      `-ss 2.5 -t 0.04 -i "${OUTPUT_QTRLE}"`,
      '-filter_complex "[0:v][1:v]overlay=format=auto:shortest=1[out]"',
      '-map "[out]" -frames:v 1',
      '/tmp/alpha_verify.png',
    ].join(' '),
    { stdio: 'pipe' }
  );

  const { execSync: es2 } = require('child_process');
  const result = es2(
    `python3 -c "
from PIL import Image; import numpy as np
img = Image.open('/tmp/alpha_verify.png').convert('RGB')
arr = np.array(img)
magenta = ((arr[:,:,0]>180) & (arr[:,:,1]<80) & (arr[:,:,2]>180)).sum()
white   = ((arr[:,:,0]>200) & (arr[:,:,1]>200) & (arr[:,:,2]>200)).sum()
total   = arr.shape[0]*arr.shape[1]
print(f'Magenta (transparent bg): {magenta}/{total} ({100*magenta//total}%)')
print(f'White (text): {white}')
print('ALPHA OK' if magenta > 1_000_000 and white > 5000 else 'ALPHA ISSUE')
"`,
    { encoding: 'utf8' }
  );
  console.log(result.trim());

  console.log(`
┌─────────────────────────────────────────────────────────────┐
│  aussies-stats.mov            QuickTime Animation (QTRLE)   │
│                               ARGB 32-bit  ·  TRUE ALPHA    │
│  aussies-stats-prores4444.mov ProRes 4444 (ap4h)            │
│                               yuva444p10le  ·  alpha        │
│  Resolution: 1920×1080  ·  50 fps  ·  ${DURATION}s                   │
└─────────────────────────────────────────────────────────────┘
`);
}

main().catch((err) => {
  console.error('\nCapture failed:', err.message);
  process.exit(1);
});
