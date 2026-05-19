// capture.js — Frame-by-frame export of the Aussies Stats lower-third animation.
// Spins up a local HTTP server, opens export.html in headless Chrome via Puppeteer,
// steps through every frame by updating React state (no page reloads), saves
// transparent PNG frames, then calls ffmpeg to assemble ProRes 4444 with alpha.

const puppeteer = require('puppeteer');
const http      = require('http');
const fs        = require('fs');
const path      = require('path');
const { execSync } = require('child_process');

const DURATION     = 3.0;
const FPS          = 50;
const TOTAL_FRAMES = Math.round(DURATION * FPS); // 150
const PORT         = 8787;
const FRAMES_DIR   = path.join(__dirname, 'frames');
const OUTPUT_FILE  = path.join(__dirname, 'aussies-stats.mov');

// Tiny static file server so Puppeteer can load the page + CDN scripts.
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
  // Start HTTP server
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`\nStatic server → http://localhost:${PORT}`);

  // Create frames output directory
  fs.mkdirSync(FRAMES_DIR, { recursive: true });

  // Launch Puppeteer
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

  // Force the Chrome compositor to use a transparent background (alpha = 0).
  const client = await page.createCDPSession();
  await client.send('Emulation.setDefaultBackgroundColorOverride', {
    color: { r: 0, g: 0, b: 0, a: 0 },
  });

  // Load the export page once — Babel will transpile and React will mount.
  console.log('Loading export.html…');
  await page.goto(`http://localhost:${PORT}/export.html`, {
    waitUntil: 'networkidle2',
    timeout: 30000,
  });

  // Wait until React has mounted and registered window.__setTime.
  await page.waitForFunction(() => window.__ready === true, { timeout: 15000 });
  console.log('React ready. Capturing frames…\n');

  const t0 = Date.now();

  for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
    const t = frame / FPS;

    // Update React state to the target time, then wait two animation frames
    // so all effects and layout have settled before we screenshot.
    await page.evaluate((time) => {
      return new Promise((resolve) => {
        window.__setTime(time);
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      });
    }, t);

    const framePath = path.join(FRAMES_DIR, `frame_${String(frame).padStart(4, '0')}.png`);
    await page.screenshot({ path: framePath, omitBackground: true });

    // Progress bar
    if (frame % 10 === 0 || frame === TOTAL_FRAMES - 1) {
      const pct = Math.round(((frame + 1) / TOTAL_FRAMES) * 100);
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      process.stdout.write(`\r  [${pct.toString().padStart(3)}%] frame ${String(frame + 1).padStart(3)}/${TOTAL_FRAMES}  t=${t.toFixed(2)}s  ${elapsed}s elapsed`);
    }
  }

  const captureTime = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n\n✓ ${TOTAL_FRAMES} frames in ${captureTime}s  →  ${FRAMES_DIR}\n`);

  await browser.close();
  server.close();

  // Assemble ProRes 4444 with alpha channel
  console.log('Assembling ProRes 4444 MOV with alpha…');
  execSync(
    [
      'ffmpeg -y',
      `-framerate ${FPS}`,
      `-i "${path.join(FRAMES_DIR, 'frame_%04d.png')}"`,
      '-c:v prores_ks',
      '-profile:v 4',          // ProRes 4444 (supports alpha)
      '-pix_fmt yuva444p10le', // 10-bit YUV + alpha
      '-vendor apl0',
      `"${OUTPUT_FILE}"`,
    ].join(' '),
    { stdio: 'inherit' }
  );

  console.log(`\n✓ ${OUTPUT_FILE}`);
  console.log('  Codec: ProRes 4444  |  Alpha: yes  |  Resolution: 1920×1080  |  FPS: 50\n');
}

main().catch((err) => {
  console.error('\nCapture failed:', err.message);
  process.exit(1);
});
