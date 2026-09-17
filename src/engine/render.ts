import { backgroundAccent, drawCover, paintBackground } from './background';
import { drawBarcode } from './barcode';
import { compositeGlow, GlowRenderer } from './glow';
import { monoFont, pixelFont, smallFont } from './fonts';
import { computeLayout, FONT_SIZES, type Layout } from './layout';
import { drawShape, PunchMask } from './punch';
import { drawSticker } from './stickers';
import type { Rect, Resources, Scene } from './types';

export type RenderOptions = {
  /** Shown inside the photo block when no photo has been chosen yet. */
  placeholder?: string;
  /** Draws selection handles for this sticker (preview only, never exported). */
  selectedStickerId?: string | null;
  /** Suppresses the paper drop shadow (used when exporting onto a backdrop). */
  flat?: boolean;
};

const SERRATION = 14;

export function formatReceiptDate(iso: string, locale: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  if (locale === 'ko') {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}.${mm}.${dd}`;
  }
  return d
    .toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })
    .toUpperCase();
}

function paperPath(ctx: CanvasRenderingContext2D, w: number, h: number, serrated: boolean): void {
  ctx.beginPath();
  if (!serrated) {
    ctx.rect(0, 0, w, h);
    ctx.closePath();
    return;
  }
  const teeth = Math.max(8, Math.round(w / SERRATION));
  const step = w / teeth;
  ctx.moveTo(0, 0);
  for (let i = 0; i < teeth; i++) {
    ctx.lineTo(step * (i + 0.5), SERRATION * 0.55);
    ctx.lineTo(step * (i + 1), 0);
  }
  ctx.lineTo(w, h);
  for (let i = teeth; i > 0; i--) {
    ctx.lineTo(step * (i - 0.5), h - SERRATION * 0.55);
    ctx.lineTo(step * (i - 1), h);
  }
  ctx.closePath();
}

let noiseTile: HTMLCanvasElement | null = null;

function getNoiseTile(): HTMLCanvasElement {
  if (noiseTile) return noiseTile;
  const size = 96;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const img = ctx.createImageData(size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = 60;
      img.data[i + 1] = 55;
      img.data[i + 2] = 48;
      img.data[i + 3] = v > 232 ? 26 : 0;
    }
    ctx.putImageData(img, 0, 0);
  }
  noiseTile = canvas;
  return canvas;
}

function dashedLine(ctx: CanvasRenderingContext2D, x1: number, y: number, x2: number, color: string): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 2;
  ctx.setLineDash([9, 9]);
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.restore();
}

type TextOpts = {
  font: string;
  color: string;
  align?: CanvasTextAlign;
  maxWidth?: number;
  skew?: number;
  letterSpacing?: number;
};

function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, o: TextOpts): void {
  if (!text) return;
  ctx.save();
  ctx.font = o.font;
  ctx.fillStyle = o.color;
  ctx.textAlign = o.align ?? 'center';
  ctx.textBaseline = 'middle';
  if (o.letterSpacing && 'letterSpacing' in ctx) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${o.letterSpacing}px`;
  }
  if (o.skew) {
    ctx.translate(x, y);
    ctx.transform(1, 0, -o.skew, 1, 0, 0);
    ctx.fillText(text, 0, 0, o.maxWidth);
  } else {
    ctx.fillText(text, x, y, o.maxWidth);
  }
  ctx.restore();
}

function centerY(rect: Rect): number {
  return rect.y + rect.h / 2;
}

/** Renders the whole receipt. The preview and the exported image both go
 *  through this one function, which is what keeps them identical. */
export class ReceiptRenderer {
  private mask = new PunchMask();
  private glow = new GlowRenderer();
  private block = document.createElement('canvas');

  /** Total receipt height in receipt units for the given scene. */
  layoutFor(scene: Scene): Layout {
    return computeLayout(scene);
  }

  render(
    ctx: CanvasRenderingContext2D,
    scene: Scene,
    res: Resources,
    scale: number,
    options: RenderOptions = {},
  ): Layout {
    const layout = computeLayout(scene);
    const { width, height } = layout;

    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // ---- paper -------------------------------------------------------
    if (!options.flat) {
      ctx.save();
      ctx.shadowColor = 'rgba(40, 33, 24, 0.22)';
      ctx.shadowBlur = 26;
      ctx.shadowOffsetY = 8;
      ctx.fillStyle = scene.paper.color;
      paperPath(ctx, width, height, scene.paper.serrated);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = scene.paper.color;
      paperPath(ctx, width, height, scene.paper.serrated);
      ctx.fill();
    }

    ctx.save();
    paperPath(ctx, width, height, scene.paper.serrated);
    ctx.clip();

    if (scene.paper.texture) {
      const pattern = ctx.createPattern(getNoiseTile(), 'repeat');
      if (pattern) {
        ctx.save();
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }
      ctx.save();
      ctx.globalAlpha = 0.05;
      ctx.fillStyle = '#2b2620';
      for (let y = 0; y < height; y += 4) ctx.fillRect(0, y, width, 1);
      ctx.restore();
    }

    const ink = scene.paper.ink;
    const accent = backgroundAccent(scene.background, res);

    // ---- header ------------------------------------------------------
    drawText(ctx, scene.text.title, width / 2, centerY(layout.title), {
      font: pixelFont(FONT_SIZES.title, 700),
      color: ink,
      maxWidth: layout.contentW,
    });
    drawText(ctx, formatReceiptDate(scene.text.date, scene.locale), width / 2, centerY(layout.date), {
      font: monoFont(FONT_SIZES.date),
      color: ink,
      maxWidth: layout.contentW,
      letterSpacing: 2,
    });
    dashedLine(ctx, layout.pad, layout.dividerTop, width - layout.pad, ink);

    // ---- photo block (background + punched photo + glow) -------------
    this.renderPhotoBlock(ctx, scene, res, scale, layout.photo, accent, options.placeholder);

    // ---- swatch grid block -------------------------------------------
    if (layout.grid) this.renderGridBlock(ctx, scene, res, layout.grid, ink);

    // ---- captions -----------------------------------------------------
    drawText(ctx, scene.text.captionLeft, layout.pad, centerY(layout.captions), {
      font: pixelFont(FONT_SIZES.caption),
      color: ink,
      align: 'left',
      maxWidth: layout.contentW * 0.5,
    });
    drawText(ctx, scene.text.captionRight, width - layout.pad, centerY(layout.captions), {
      font: pixelFont(FONT_SIZES.caption),
      color: ink,
      align: 'right',
      maxWidth: layout.contentW * 0.5,
    });
    drawText(ctx, scene.text.tagline, width / 2, centerY(layout.tagline), {
      font: monoFont(FONT_SIZES.tagline),
      color: ink,
      maxWidth: layout.contentW,
      skew: 0.18,
      letterSpacing: 1,
    });

    dashedLine(ctx, layout.pad, layout.dividerBottom, width - layout.pad, ink);

    if (layout.barcode) {
      drawBarcode(
        ctx,
        layout.barcode.x,
        layout.barcode.y,
        layout.barcode.w,
        layout.barcode.h,
        `${scene.text.date}-${scene.text.title}`,
        accent,
      );
    }
    drawText(ctx, scene.text.footer, width / 2, centerY(layout.footer), {
      font: smallFont(FONT_SIZES.footer),
      color: ink,
      maxWidth: layout.contentW,
      letterSpacing: 3,
    });

    // ---- stickers ------------------------------------------------------
    const meta = { date: scene.text.date, locale: scene.locale };
    for (const sticker of scene.stickers) drawSticker(ctx, sticker, res, meta);

    ctx.restore(); // paper clip
    ctx.restore(); // transform

    return layout;
  }

  private renderPhotoBlock(
    ctx: CanvasRenderingContext2D,
    scene: Scene,
    res: Resources,
    scale: number,
    rect: Rect,
    accent: string,
    placeholder?: string,
  ): void {
    const pxW = Math.max(1, Math.round(rect.w * scale));
    const pxH = Math.max(1, Math.round(rect.h * scale));
    if (this.block.width !== pxW || this.block.height !== pxH) {
      this.block.width = pxW;
      this.block.height = pxH;
    }
    const bctx = this.block.getContext('2d');
    if (!bctx) return;
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.clearRect(0, 0, pxW, pxH);
    bctx.setTransform(scale, 0, 0, scale, 0, 0);

    // 1. background — this is what shows through the holes.
    paintBackground(bctx, rect.w, rect.h, scene.background, res);

    // 2. photo, punched through by the mask.
    const mask = this.mask.sync(scene.strokes, rect.w, rect.h, scale);
    const photo = scene.photo.imageId ? res.get(scene.photo.imageId) : undefined;
    if (photo) {
      bctx.save();
      bctx.beginPath();
      bctx.rect(0, 0, rect.w, rect.h);
      bctx.clip();
      drawCover(bctx, photo, rect.w, rect.h, scene.photo.offsetX, scene.photo.offsetY, scene.photo.scale);
      bctx.restore();
      bctx.save();
      bctx.setTransform(1, 0, 0, 1, 0, 0);
      bctx.globalCompositeOperation = 'destination-out';
      bctx.drawImage(mask, 0, 0);
      bctx.restore();
    }

    // 3. glow rising off the punched edges.
    const glowColor = scene.glow.color === 'auto' ? accent : scene.glow.color;
    const glow = this.glow.render(mask, scene.glow, glowColor, scale);
    if (glow) {
      bctx.save();
      bctx.setTransform(1, 0, 0, 1, 0, 0);
      compositeGlow(bctx, glow, 0, 0, pxW, pxH, scene.glow.intensity);
      bctx.restore();
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    ctx.drawImage(this.block, rect.x, rect.y, rect.w, rect.h);
    ctx.restore();

    if (!photo && placeholder) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.setLineDash([10, 8]);
      ctx.lineWidth = 2;
      ctx.strokeRect(rect.x + 12, rect.y + 12, rect.w - 24, rect.h - 24);
      ctx.restore();
      drawText(ctx, placeholder, rect.x + rect.w / 2, rect.y + rect.h / 2, {
        font: pixelFont(20, 700),
        color: 'rgba(30,26,20,0.65)',
      });
    }
  }

  /** The swatch block from the reference receipts: a fading grid of the
   *  current punch shape, printed over the background colour. */
  private renderGridBlock(
    ctx: CanvasRenderingContext2D,
    scene: Scene,
    res: Resources,
    rect: Rect,
    ink: string,
  ): void {
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    ctx.translate(rect.x, rect.y);
    paintBackground(ctx, rect.w, rect.h, scene.background, res);

    const cols = 5;
    const rows = 3;
    const cellW = rect.w / (cols + 1.6);
    const cellH = rect.h / (rows + 1.2);
    const size = Math.min(cellW, cellH) * 0.72;
    const startX = (rect.w - cellW * (cols - 1)) / 2;
    const startY = (rect.h - cellH * (rows - 1)) / 2;

    ctx.fillStyle = ink;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const t = (r * cols + c) / (rows * cols - 1);
        ctx.globalAlpha = 0.95 - t * 0.78;
        drawShape(ctx, scene.brush.shape, startX + c * cellW, startY + r * cellH, size, 0, ink);
      }
    }
    ctx.restore();
  }
}
