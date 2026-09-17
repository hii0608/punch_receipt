import { stickerSize } from './stickers';
import type { Resources, Scene, Sticker, Vec2 } from './types';

export const HANDLE_RADIUS = 20;

export type HandleKind = 'transform' | 'delete';

/** Converts a receipt-space point into a sticker's un-rotated local frame,
 *  with the origin at the sticker's top-left corner. */
export function toLocal(sticker: Sticker, p: Vec2, size: { w: number; h: number }): Vec2 {
  const dx = p.x - sticker.x;
  const dy = p.y - sticker.y;
  const cos = Math.cos(-sticker.rotation);
  const sin = Math.sin(-sticker.rotation);
  return {
    x: dx * cos - dy * sin + size.w / 2,
    y: dx * sin + dy * cos + size.h / 2,
  };
}

/** Receipt-space position of a sticker's corner handle. */
export function handlePosition(
  sticker: Sticker,
  size: { w: number; h: number },
  corner: HandleKind,
): Vec2 {
  const lx = corner === 'transform' ? size.w / 2 : -size.w / 2;
  const ly = corner === 'transform' ? size.h / 2 : -size.h / 2;
  const cos = Math.cos(sticker.rotation);
  const sin = Math.sin(sticker.rotation);
  return {
    x: sticker.x + lx * cos - ly * sin,
    y: sticker.y + lx * sin + ly * cos,
  };
}

export function hitHandle(
  sticker: Sticker,
  p: Vec2,
  res: Resources,
  tolerance = HANDLE_RADIUS,
): HandleKind | null {
  const size = stickerSize(sticker.ref, sticker.scale, res);
  for (const kind of ['transform', 'delete'] as HandleKind[]) {
    const pos = handlePosition(sticker, size, kind);
    if (Math.hypot(pos.x - p.x, pos.y - p.y) <= tolerance) return kind;
  }
  return null;
}

/** Topmost sticker under the point, or null. */
export function hitSticker(scene: Scene, res: Resources, p: Vec2): Sticker | null {
  for (let i = scene.stickers.length - 1; i >= 0; i--) {
    const sticker = scene.stickers[i]!;
    const size = stickerSize(sticker.ref, sticker.scale, res);
    const local = toLocal(sticker, p, size);
    if (local.x >= 0 && local.y >= 0 && local.x <= size.w && local.y <= size.h) return sticker;
  }
  return null;
}

/** Draws the selection frame. Preview only — never part of an export. */
export function drawStickerSelection(
  ctx: CanvasRenderingContext2D,
  sticker: Sticker,
  res: Resources,
): void {
  const size = stickerSize(sticker.ref, sticker.scale, res);
  ctx.save();
  ctx.translate(sticker.x, sticker.y);
  ctx.rotate(sticker.rotation);
  ctx.strokeStyle = '#2f6fed';
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 5]);
  ctx.strokeRect(-size.w / 2, -size.h / 2, size.w, size.h);
  ctx.setLineDash([]);

  const dot = (x: number, y: number, fill: string, glyph: string) => {
    ctx.beginPath();
    ctx.arc(x, y, HANDLE_RADIUS * 0.72, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 17px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(glyph, x, y + 1);
  };
  dot(size.w / 2, size.h / 2, '#2f6fed', '⤡');
  dot(-size.w / 2, -size.h / 2, '#e2564d', '×');
  ctx.restore();
}
