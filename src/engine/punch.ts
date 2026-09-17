import type { PunchShape, Stroke, Vec2 } from './types';

/* ------------------------------------------------------------------ *
 * Deterministic randomness
 * ------------------------------------------------------------------ */

function mulberry32(a: number): () => number {
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ *
 * Pixel-art shape sprites
 * ------------------------------------------------------------------ */

const PIXEL_ART: Record<string, string[]> = {
  thumb: [
    '..xx........',
    '.xxxx.......',
    '.xxxx.......',
    '.xxxx.......',
    '.xxxxxxxxxx.',
    'xxxxxxxxxxxx',
    'xxxxxxxxxxxx',
    'xxxxxxxxxxxx',
    '.xxxxxxxxxx.',
    '..xxxxxxxx..',
  ],
  heart: [
    '.xx...xx.',
    'xxxxxxxxx',
    'xxxxxxxxx',
    'xxxxxxxxx',
    '.xxxxxxx.',
    '..xxxxx..',
    '...xxx...',
    '....x....',
  ],
  star: [
    '.....x.....',
    '....xxx....',
    '....xxx....',
    'xxxxxxxxxxx',
    '.xxxxxxxxx.',
    '..xxxxxxx..',
    '...xxxxx...',
    '..xxx.xxx..',
    '..xx...xx..',
    '.xx.....xx.',
  ],
  sparkle: [
    '....x....',
    '....x....',
    '...xxx...',
    '...xxx...',
    'xxxxxxxxx',
    '...xxx...',
    '...xxx...',
    '....x....',
    '....x....',
  ],
  flower: [
    '..x...x..',
    '.xxx.xxx.',
    '.xxxxxxx.',
    '..xxxxx..',
    'xxxxxxxxx',
    '..xxxxx..',
    '.xxxxxxx.',
    '.xxx.xxx.',
    '..x...x..',
  ],
};

const CELL = 8;
const spriteCache = new Map<string, HTMLCanvasElement>();
const tintCache = new Map<string, HTMLCanvasElement>();

/** Rasterises a pixel-art grid once; stamping then just blits it. */
function getSprite(shape: PunchShape): HTMLCanvasElement | null {
  const art = PIXEL_ART[shape];
  if (!art || art.length === 0) return null;
  const cached = spriteCache.get(shape);
  if (cached) return cached;

  const rows = art.length;
  const cols = art[0]!.length;
  const canvas = document.createElement('canvas');
  canvas.width = cols * CELL;
  canvas.height = rows * CELL;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#fff';
  for (let r = 0; r < rows; r++) {
    const line = art[r]!;
    for (let c = 0; c < line.length; c++) {
      if (line[c] === 'x') ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
    }
  }
  spriteCache.set(shape, canvas);
  return canvas;
}

/** Pixel-art sprites are white by definition; tint them once per colour so
 *  the swatch grid and the shape picker can draw them in the ink colour. */
function getTintedSprite(shape: PunchShape, color: string): HTMLCanvasElement | null {
  const base = getSprite(shape);
  if (!base) return null;
  const key = `${shape}|${color}`;
  const cached = tintCache.get(key);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = base.width;
  canvas.height = base.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return base;
  ctx.drawImage(base, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  tintCache.set(key, canvas);
  return canvas;
}

/** Aspect-correct sprite footprint, so a heart is not stretched into a square. */
function spriteBox(sprite: HTMLCanvasElement, size: number): { w: number; h: number } {
  const longest = Math.max(sprite.width, sprite.height);
  return { w: (sprite.width / longest) * size, h: (sprite.height / longest) * size };
}

/** Draws one punch mark centred on (x, y).
 *  `color` tints pixel-art shapes; without it they stay white, which is what
 *  the punch mask wants. Procedural shapes use the current fill style. */
export function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: PunchShape,
  x: number,
  y: number,
  size: number,
  rot: number,
  color?: string,
): void {
  const sprite = color ? getTintedSprite(shape, color) : getSprite(shape);
  if (sprite) {
    const { w, h } = spriteBox(sprite, size);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sprite, -w / 2, -h / 2, w, h);
    ctx.restore();
    return;
  }

  ctx.save();
  if (color) ctx.fillStyle = color;
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  if (shape === 'square') {
    ctx.rect(-size / 2, -size / 2, size, size);
  } else {
    ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.restore();
}

/* ------------------------------------------------------------------ *
 * Stamp placement
 * ------------------------------------------------------------------ */

export type Stamp = { x: number; y: number; size: number; rot: number };

export function stampAt(stroke: Stroke, index: number, point: Vec2): Stamp {
  const rand = mulberry32(stroke.seed + index * 7919);
  const size = stroke.minSize + rand() * Math.max(0, stroke.maxSize - stroke.minSize);
  const rot = stroke.shape === 'circle' ? 0 : (rand() - 0.5) * Math.PI * 2 * 0.35;
  const avg = (stroke.minSize + stroke.maxSize) / 2;
  const scatter = stroke.jitter * avg;
  return {
    x: point.x + (rand() - 0.5) * scatter,
    y: point.y + (rand() - 0.5) * scatter,
    size,
    rot,
  };
}

/** Walks a stroke's polyline, emitting stamps at a fixed arc-length step.
 *  It keeps its position between calls so a growing stroke only pays for the
 *  newly added segments — and because the step is arc-length based, the result
 *  is identical whether the points arrived in one batch or fifty. */
export class StrokeCursor {
  private pointIndex = 0;
  private distAtPoint = 0;
  private nextStampDist = 0;
  private index = 0;
  private tapped = false;

  get stampCount(): number {
    return this.index;
  }

  advance(stroke: Stroke): Stamp[] {
    const pts = stroke.points;
    const avg = (stroke.minSize + stroke.maxSize) / 2;
    const step = Math.max(1, avg * stroke.spacing);
    const out: Stamp[] = [];

    if (pts.length === 1 && !this.tapped) {
      this.tapped = true;
      out.push(stampAt(stroke, this.index++, pts[0]!));
      this.nextStampDist = step;
      return out;
    }

    while (this.pointIndex < pts.length - 1) {
      const a = pts[this.pointIndex]!;
      const b = pts[this.pointIndex + 1]!;
      const segLen = Math.hypot(b.x - a.x, b.y - a.y);
      if (segLen > 0) {
        while (this.nextStampDist <= this.distAtPoint + segLen) {
          const t = (this.nextStampDist - this.distAtPoint) / segLen;
          const point = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
          out.push(stampAt(stroke, this.index++, point));
          this.nextStampDist += step;
        }
        this.distAtPoint += segLen;
      }
      this.pointIndex++;
    }
    return out;
  }
}

/* ------------------------------------------------------------------ *
 * Punch mask
 * ------------------------------------------------------------------ */

/** White-on-transparent canvas holding every hole punched so far.
 *  Strokes are applied incrementally; an undo (or any change to an already
 *  applied stroke) triggers a rebuild. */
export class PunchMask {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cursors = new Map<string, StrokeCursor>();
  private appliedIds: string[] = [];
  private w = 0;
  private h = 0;
  private scale = 1;

  constructor() {
    this.canvas = document.createElement('canvas');
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2d context unavailable');
    this.ctx = ctx;
  }

  get isEmpty(): boolean {
    return this.appliedIds.length === 0;
  }

  sync(strokes: Stroke[], w: number, h: number, scale: number): HTMLCanvasElement {
    const resized = this.w !== w || this.h !== h || this.scale !== scale;
    if (resized) {
      this.w = w;
      this.h = h;
      this.scale = scale;
      this.canvas.width = Math.max(1, Math.round(w * scale));
      this.canvas.height = Math.max(1, Math.round(h * scale));
    }

    const diverged =
      strokes.length < this.appliedIds.length ||
      this.appliedIds.some((id, i) => strokes[i]?.id !== id);

    if (resized || diverged) this.rebuild(strokes);
    else this.applyPending(strokes);

    return this.canvas;
  }

  private reset(): void {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.cursors.clear();
    this.appliedIds = [];
  }

  private rebuild(strokes: Stroke[]): void {
    this.reset();
    this.applyPending(strokes);
  }

  private applyPending(strokes: Stroke[]): void {
    const ctx = this.ctx;
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#fff';

    for (const stroke of strokes) {
      let cursor = this.cursors.get(stroke.id);
      if (!cursor) {
        cursor = new StrokeCursor();
        this.cursors.set(stroke.id, cursor);
        this.appliedIds.push(stroke.id);
      }
      for (const stamp of cursor.advance(stroke)) {
        drawShape(ctx, stroke.shape, stamp.x, stamp.y, stamp.size, stamp.rot);
      }
    }
  }
}

export const PUNCH_SHAPES: PunchShape[] = [
  'circle',
  'square',
  'star',
  'heart',
  'thumb',
  'sparkle',
  'flower',
];
