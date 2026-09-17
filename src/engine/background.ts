import type { BackgroundFill, ImageSource, Resources } from './types';

function sourceSize(img: ImageSource): { w: number; h: number } {
  if (img instanceof HTMLImageElement) return { w: img.naturalWidth, h: img.naturalHeight };
  return { w: img.width, h: img.height };
}

/** Cover-fit placement with a user pan/zoom applied on top. */
export function coverRect(
  img: ImageSource,
  boxW: number,
  boxH: number,
  offsetX: number,
  offsetY: number,
  zoom: number,
): { x: number; y: number; w: number; h: number } {
  const { w: iw, h: ih } = sourceSize(img);
  if (!iw || !ih) return { x: 0, y: 0, w: boxW, h: boxH };
  const base = Math.max(boxW / iw, boxH / ih);
  const s = base * zoom;
  const w = iw * s;
  const h = ih * s;
  return { x: (boxW - w) / 2 + offsetX * boxW, y: (boxH - h) / 2 + offsetY * boxH, w, h };
}

export function drawCover(
  ctx: CanvasRenderingContext2D,
  img: ImageSource,
  boxW: number,
  boxH: number,
  offsetX: number,
  offsetY: number,
  zoom: number,
): void {
  const r = coverRect(img, boxW, boxH, offsetX, offsetY, zoom);
  ctx.drawImage(img as CanvasImageSource, r.x, r.y, r.w, r.h);
}

export function paintBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  fill: BackgroundFill,
  res: Resources,
): void {
  if (fill.kind === 'solid') {
    ctx.fillStyle = fill.color;
    ctx.fillRect(0, 0, w, h);
    return;
  }

  if (fill.kind === 'gradient') {
    const stops = [...fill.stops].sort((a, b) => a.offset - b.offset);
    let grad: CanvasGradient;
    if (fill.type === 'radial') {
      const r = Math.hypot(w, h) / 2;
      grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, r);
    } else {
      const rad = (fill.angle * Math.PI) / 180;
      const cx = w / 2;
      const cy = h / 2;
      // Half-diagonal projected onto the gradient axis keeps both ends on-canvas.
      const len = (Math.abs(w * Math.cos(rad)) + Math.abs(h * Math.sin(rad))) / 2;
      grad = ctx.createLinearGradient(
        cx - Math.cos(rad) * len,
        cy - Math.sin(rad) * len,
        cx + Math.cos(rad) * len,
        cy + Math.sin(rad) * len,
      );
    }
    for (const stop of stops) grad.addColorStop(Math.min(1, Math.max(0, stop.offset)), stop.color);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    return;
  }

  const img = res.get(fill.imageId);
  if (!img) {
    ctx.fillStyle = '#d8d4cc';
    ctx.fillRect(0, 0, w, h);
    return;
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();
  drawCover(ctx, img, w, h, fill.offsetX, fill.offsetY, fill.scale);
  ctx.restore();
}

const averageCache = new WeakMap<object, string>();

/** Average colour of an image, used when the glow colour is set to "auto". */
export function averageColor(img: ImageSource): string {
  const cached = averageCache.get(img as object);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  let result = '#ffffff';
  if (ctx) {
    try {
      ctx.drawImage(img as CanvasImageSource, 0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data;
      result = `rgb(${d[0]}, ${d[1]}, ${d[2]})`;
    } catch {
      result = '#ffffff';
    }
  }
  averageCache.set(img as object, result);
  return result;
}

/** The colour that best represents what shows through the punched holes. */
export function backgroundAccent(fill: BackgroundFill, res: Resources): string {
  if (fill.kind === 'solid') return fill.color;
  if (fill.kind === 'gradient') {
    const stops = [...fill.stops].sort((a, b) => a.offset - b.offset);
    return stops[Math.floor(stops.length / 2)]?.color ?? '#ffffff';
  }
  const img = res.get(fill.imageId);
  return img ? averageColor(img) : '#ffffff';
}
