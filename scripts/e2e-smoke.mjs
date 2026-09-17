import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { writeSamplePhoto } from './make-fixture.mjs';

/**
 * End-to-end smoke test: drives the running dev server through the whole
 * flow (photo -> punch -> glow -> backdrop -> copy -> stickers -> export ->
 * reload) and writes screenshots plus the real exported PNGs.
 *
 *   npm run dev            # in one terminal
 *   npm run smoke          # in another
 *
 * Env: BASE_URL (default http://localhost:5173), CHROMIUM (browser binary),
 *      SMOKE_OUT (output directory).
 */
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173/';
const OUT = process.env.SMOKE_OUT ?? path.join(os.tmpdir(), 'punch-receipt-smoke');
const SP = OUT;
await fs.mkdir(OUT, { recursive: true });
await writeSamplePhoto(path.join(SP, 'sample-photo.png'));
const errors = [];
const log = [];

const browser = await chromium.launch({
  ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}),
  args: ['--no-sandbox'],
});
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  locale: 'ko-KR',
  acceptDownloads: true,
});
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

const shot = (name) => page.screenshot({ path: path.join(OUT, name) });
const canvas = page.locator('canvas.receipt-canvas');

await page.goto(BASE_URL, { waitUntil: 'networkidle' });
await page.waitForSelector('canvas.receipt-canvas');
await page.waitForTimeout(800);
await shot('01-initial.png');

// photo upload via the placeholder tap
{
  const b = await canvas.boundingBox();
  const chooser = page.waitForEvent('filechooser');
  await page.mouse.click(b.x + b.width / 2, b.y + b.height * 0.33);
  (await chooser).setFiles(path.join(SP, 'sample-photo.png'));
  await page.waitForTimeout(900);
}

// a solid backdrop shows the punching most clearly
await page.getByRole('tab', { name: '배경' }).click();
await page.locator('.seg button', { hasText: '단색' }).click();
await page.locator('.swatch').first().click();   // lime
await page.waitForTimeout(300);
await page.getByRole('tab', { name: '펀치' }).click();
await page.waitForTimeout(200);
await shot('02-photo-lime.png');

async function stroke(points) {
  const b = await canvas.boundingBox();
  await page.mouse.move(b.x + b.width * points[0][0], b.y + b.height * points[0][1]);
  await page.mouse.down();
  for (const [fx, fy] of points.slice(1)) {
    await page.mouse.move(b.x + b.width * fx, b.y + b.height * fy, { steps: 14 });
  }
  await page.mouse.up();
  await page.waitForTimeout(140);
}

// pick the thumb shape, then scribble
await page.locator('.chip', { hasText: '엄지' }).click();
await stroke([[0.20, 0.19], [0.40, 0.27], [0.60, 0.19], [0.80, 0.28]]);
await stroke([[0.22, 0.33], [0.50, 0.37], [0.78, 0.32]]);
await page.waitForTimeout(400);
await shot('03-punched-thumb.png');

const setRange = async (label, value) => {
  const row = page.locator('.row', { hasText: label }).first();
  await row.locator("input[type='range']").evaluate((el, v) => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, String(v));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await page.waitForTimeout(120);
};
await setRange('세기', 1.6);
await setRange('번짐', 26);
await page.locator('.toggle', { hasText: '테두리만' }).locator('input').check();
await page.waitForTimeout(400);
await shot('04-glow-ring.png');

// undo once, then redo
await page.locator('.iconbtn[aria-label="실행취소"]').click();
await page.waitForTimeout(350);
await shot('05-after-undo.png');
await page.locator('.iconbtn[aria-label="다시실행"]').click();
await page.waitForTimeout(350);

// gradient backdrop
await page.getByRole('tab', { name: '배경' }).click();
await page.locator('.seg button', { hasText: '그라데이션' }).click();
await page.waitForTimeout(200);
await page.locator('.chipgrid .chip').nth(0).click();
await page.waitForTimeout(350);
await shot('06-bg-gradient.png');

// receipt copy
await page.getByRole('tab', { name: '영수증' }).click();
const fill = async (label, value) => {
  await page.locator('.field', { hasText: label }).first().locator('input').fill(value);
  await page.waitForTimeout(80);
};
await fill('제목', '먹은 것 일기');
await fill('왼쪽 메모', '커피 휴식');
await fill('오른쪽 메모', '@연남동');
await page.waitForTimeout(400);
await shot('07-receipt-text.png');

// stickers: three of them, no overlap
await page.getByRole('tab', { name: '스티커' }).click();
await page.waitForTimeout(250);
await page.locator('.chipgrid .chip').nth(0).click();
await page.waitForTimeout(250);
await page.locator('.chipgrid .chip').nth(2).click();
await page.waitForTimeout(250);
await page.locator('.chipgrid .chip').nth(6).click();
await page.waitForTimeout(400);
await shot('08-stickers.png');

// drag the selected sticker, then resize with the corner handle
{
  const b = await canvas.boundingBox();
  await page.mouse.move(b.x + b.width * 0.66, b.y + b.height * 0.55);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width * 0.30, b.y + b.height * 0.68, { steps: 20 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  await shot('09-sticker-moved.png');
}

// English
await page.locator('.langtoggle button', { hasText: 'EN' }).click();
await page.waitForTimeout(700);
await shot('10-english.png');
await page.locator('.langtoggle button', { hasText: 'KO' }).click();
await page.waitForTimeout(400);

// export: save the real files the app produces
await page.getByRole('tab', { name: '공유' }).click();
await page.waitForTimeout(300);

const saveVia = async (ratioLabel, name) => {
  if (ratioLabel) await page.locator('.seg button', { hasText: ratioLabel }).click();
  await page.waitForTimeout(200);
  const wait = page.waitForEvent('download', { timeout: 30000 });
  await page.locator('.btn', { hasText: '이미지로 저장' }).click();
  const dl = await wait;
  const target = path.join(OUT, name);
  await dl.saveAs(target);
  const buf = await fs.readFile(target);
  log.push(`${name}: ${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)} (${(buf.length / 1024).toFixed(0)}KB) <- ${dl.suggestedFilename()}`);
};
await saveVia(null, '11-export-receipt.png');
await saveVia('스토리', '12-export-story.png');
await page.locator('.seg button', { hasText: '영수증 그대로' }).click();

// reload -> the session must come back
await page.waitForTimeout(1600);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1800);
await shot('13-restored-after-reload.png');
await page.getByRole('tab', { name: '영수증' }).click();
await page.waitForTimeout(300);
const restoredTitle = await page.locator('.field', { hasText: '제목' }).first().locator('input').inputValue();
log.push(`restored title from UI: ${restoredTitle}`);
await page.getByRole('tab', { name: '펀치' }).click();

// desktop
await page.setViewportSize({ width: 1280, height: 900 });
await page.waitForTimeout(700);
await shot('14-desktop.png');

// narrow phone
await page.setViewportSize({ width: 320, height: 720 });
await page.waitForTimeout(600);
await shot('15-narrow.png');

console.log(log.join('\n'));
console.log(`screenshots: ${OUT}`);
await browser.close();

if (errors.length) {
  console.error('console errors:', errors);
  process.exitCode = 1;
} else {
  console.log('no console errors');
}
