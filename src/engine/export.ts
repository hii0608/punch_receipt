import { paintBackground } from './background';
import { fontsReady } from './fonts';
import { ReceiptRenderer } from './render';
import type { Resources, Scene } from './types';

export type ExportRatio = 'receipt' | 'story' | 'square';

const RATIO_SIZES: Record<Exclude<ExportRatio, 'receipt'>, { w: number; h: number }> = {
  story: { w: 1080, h: 1920 },
  square: { w: 1200, h: 1200 },
};

function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png'): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('canvas.toBlob returned null'));
    }, type);
  });
}

/** Renders the receipt on its own, at `scale` device pixels per receipt unit. */
export async function renderReceiptCanvas(
  scene: Scene,
  res: Resources,
  scale: number,
): Promise<HTMLCanvasElement> {
  await fontsReady();
  const renderer = new ReceiptRenderer();
  const layout = renderer.layoutFor(scene);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(layout.width * scale);
  canvas.height = Math.round(layout.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable');
  renderer.render(ctx, scene, res, scale, { flat: true });
  return canvas;
}

/** Renders the final shareable image: the receipt itself, or the receipt laid
 *  on a backdrop for story / square crops. */
export async function composeExport(
  scene: Scene,
  res: Resources,
  ratio: ExportRatio,
  scale = 3,
): Promise<HTMLCanvasElement> {
  if (ratio === 'receipt') return renderReceiptCanvas(scene, res, scale);

  const target = RATIO_SIZES[ratio];
  const canvas = document.createElement('canvas');
  canvas.width = target.w;
  canvas.height = target.h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable');

  paintBackground(ctx, target.w, target.h, scene.background, res);
  ctx.save();
  ctx.fillStyle = 'rgba(12, 10, 8, 0.18)';
  ctx.fillRect(0, 0, target.w, target.h);
  ctx.restore();

  const receipt = await renderReceiptCanvas(scene, res, scale);
  const margin = ratio === 'story' ? 0.86 : 0.9;
  const fit = Math.min(
    (target.w * margin) / receipt.width,
    (target.h * margin) / receipt.height,
  );
  const w = receipt.width * fit;
  const h = receipt.height * fit;
  const x = (target.w - w) / 2;
  const y = (target.h - h) / 2;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = target.w * 0.04;
  ctx.shadowOffsetY = target.w * 0.012;
  ctx.drawImage(receipt, x, y, w, h);
  ctx.restore();
  return canvas;
}

export async function exportBlob(
  scene: Scene,
  res: Resources,
  ratio: ExportRatio,
  scale = 3,
): Promise<Blob> {
  const canvas = await composeExport(scene, res, ratio, scale);
  return canvasToBlob(canvas);
}

export function exportFilename(scene: Scene): string {
  const stamp = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const time = `${pad(stamp.getHours())}${pad(stamp.getMinutes())}`;
  return `punch-receipt-${scene.text.date.replace(/-/g, '')}-${time}.png`;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled';

/** Uses the OS share sheet where available (that is the path that reaches
 *  Instagram / KakaoTalk on a phone) and falls back to a download. */
export async function shareImage(blob: Blob, filename: string, title: string): Promise<ShareOutcome> {
  const file = new File([blob], filename, { type: blob.type || 'image/png' });
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (typeof nav.share === 'function' && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title });
      return 'shared';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
      // Any other failure falls through to the download path.
    }
  }
  downloadBlob(blob, filename);
  return 'downloaded';
}

export async function copyImage(blob: Blob): Promise<boolean> {
  try {
    const Item = (window as unknown as { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
    if (!Item || !navigator.clipboard?.write) return false;
    await navigator.clipboard.write([new Item({ [blob.type || 'image/png']: blob })]);
    return true;
  } catch {
    return false;
  }
}
