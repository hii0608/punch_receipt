import { drawBarcode } from './barcode';
import { FONT_FAMILY, pixelFont, smallFont } from './fonts';
import type { ImageSource, Locale, Resources, Sticker, StickerRef } from './types';

export type StickerMeta = { date: string; locale: Locale };

export type BuiltinSticker = {
  id: string;
  /** Natural height relative to a width of 1. */
  aspect: number;
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number, color: string, meta: StickerMeta) => void;
};

/** Receipt-space width of a sticker at scale 1. */
export const STICKER_BASE = 150;

const WEEKDAYS: Record<Locale, string[]> = {
  ko: ['일', '월', '화', '수', '목', '금', '토'],
  en: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
};

const MONTHS: Record<Locale, string[]> = {
  ko: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  en: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
};

export function parseDate(iso: string): Date {
  const parsed = new Date(`${iso}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function starPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, outer: number, inner: number, points: number): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / points) * i - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** Four-point "sparkle" with concave sides — the retro twinkle. */
function sparklePath(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number): void {
  const k = 0.16;
  ctx.beginPath();
  ctx.moveTo(cx, cy - ry);
  ctx.quadraticCurveTo(cx + rx * k, cy - ry * k, cx + rx, cy);
  ctx.quadraticCurveTo(cx + rx * k, cy + ry * k, cx, cy + ry);
  ctx.quadraticCurveTo(cx - rx * k, cy + ry * k, cx - rx, cy);
  ctx.quadraticCurveTo(cx - rx * k, cy - ry * k, cx, cy - ry);
  ctx.closePath();
}

const BUILTINS: BuiltinSticker[] = [
  {
    id: 'calendar-page',
    aspect: 1.08,
    draw: (ctx, w, h, color, meta) => {
      const date = parseDate(meta.date);
      const headerH = h * 0.28;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.18)';
      ctx.shadowBlur = w * 0.05;
      ctx.shadowOffsetY = w * 0.02;
      ctx.fillStyle = '#fffdf7';
      roundRect(ctx, 0, 0, w, h, w * 0.08);
      ctx.fill();
      ctx.restore();

      ctx.save();
      roundRect(ctx, 0, 0, w, h, w * 0.08);
      ctx.clip();
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, w, headerH);
      ctx.restore();

      ctx.fillStyle = '#fffdf7';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = pixelFont(headerH * 0.52, 700);
      ctx.fillText(MONTHS[meta.locale][date.getMonth()] ?? '', w / 2, headerH * 0.56);

      ctx.fillStyle = '#26221d';
      ctx.font = pixelFont(h * 0.36, 700);
      ctx.fillText(String(date.getDate()), w / 2, headerH + (h - headerH) * 0.44);

      ctx.fillStyle = color;
      ctx.font = smallFont(h * 0.12);
      ctx.fillText(WEEKDAYS[meta.locale][date.getDay()] ?? '', w / 2, headerH + (h - headerH) * 0.8);

      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = Math.max(1, w * 0.012);
      roundRect(ctx, 0, 0, w, h, w * 0.08);
      ctx.stroke();

      // Binder rings.
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (const rx of [w * 0.3, w * 0.7]) {
        ctx.beginPath();
        ctx.arc(rx, headerH * 0.12, w * 0.035, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  },
  {
    id: 'calendar-strip',
    aspect: 0.42,
    draw: (ctx, w, h, color, meta) => {
      const date = parseDate(meta.date);
      const cell = w / 7;
      ctx.save();
      ctx.fillStyle = '#fffdf7';
      roundRect(ctx, 0, 0, w, h, h * 0.16);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = Math.max(1, w * 0.008);
      ctx.stroke();
      ctx.restore();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const day = date.getDay();
      const start = date.getDate() - day;
      for (let i = 0; i < 7; i++) {
        const cx = cell * i + cell / 2;
        ctx.font = smallFont(h * 0.22);
        ctx.fillStyle = i === 0 ? '#c8503c' : '#7a746a';
        ctx.fillText(WEEKDAYS[meta.locale][i]?.slice(0, meta.locale === 'ko' ? 1 : 1) ?? '', cx, h * 0.3);

        const dayNum = start + i;
        const label = dayNum > 0 ? String(dayNum) : '';
        if (i === day) {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(cx, h * 0.66, cell * 0.36, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fffdf7';
        } else {
          ctx.fillStyle = '#3a352e';
        }
        ctx.font = pixelFont(h * 0.26, 700);
        ctx.fillText(label, cx, h * 0.68);
      }
    },
  },
  {
    id: 'sparkle',
    aspect: 1,
    draw: (ctx, w, h, color) => {
      ctx.fillStyle = color;
      sparklePath(ctx, w / 2, h / 2, w / 2, h / 2);
      ctx.fill();
      sparklePath(ctx, w * 0.82, h * 0.2, w * 0.16, h * 0.16);
      ctx.fill();
    },
  },
  {
    id: 'star',
    aspect: 0.95,
    draw: (ctx, w, h, color) => {
      ctx.fillStyle = color;
      starPath(ctx, w / 2, h / 2, Math.min(w, h) / 2, Math.min(w, h) / 4.6, 5);
      ctx.fill();
    },
  },
  {
    id: 'heart',
    aspect: 0.9,
    draw: (ctx, w, h, color) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(w / 2, h * 0.95);
      ctx.bezierCurveTo(-w * 0.15, h * 0.5, w * 0.2, -h * 0.1, w / 2, h * 0.26);
      ctx.bezierCurveTo(w * 0.8, -h * 0.1, w * 1.15, h * 0.5, w / 2, h * 0.95);
      ctx.closePath();
      ctx.fill();
    },
  },
  {
    id: 'tape',
    aspect: 0.32,
    draw: (ctx, w, h, color) => {
      ctx.save();
      ctx.globalAlpha = 0.72;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.12);
      ctx.lineTo(w, 0);
      ctx.lineTo(w, h * 0.88);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();
      ctx.clip();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#ffffff';
      const stripe = w * 0.08;
      for (let x = -h; x < w + h; x += stripe * 2) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + stripe, 0);
        ctx.lineTo(x + stripe - h, h);
        ctx.lineTo(x - h, h);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    },
  },
  {
    id: 'stamp',
    aspect: 1,
    draw: (ctx, w, h, color, meta) => {
      const r = Math.min(w, h) / 2;
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(-0.18);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = Math.max(2, r * 0.09);
      ctx.globalAlpha = 0.88;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.94, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.74, 0, Math.PI * 2);
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = pixelFont(r * 0.42, 700);
      ctx.fillText(meta.locale === 'ko' ? '완료' : 'DONE', 0, -r * 0.08);
      ctx.font = smallFont(r * 0.2);
      ctx.fillText(meta.date.replace(/-/g, '.'), 0, r * 0.38);
      ctx.restore();
    },
  },
  {
    id: 'ticket',
    aspect: 0.46,
    draw: (ctx, w, h, color, meta) => {
      ctx.save();
      ctx.fillStyle = '#fffdf7';
      roundRect(ctx, 0, 0, w, h, h * 0.14);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.5, w * 0.012);
      ctx.stroke();
      ctx.beginPath();
      ctx.setLineDash([h * 0.09, h * 0.07]);
      ctx.moveTo(w * 0.66, h * 0.08);
      ctx.lineTo(w * 0.66, h * 0.92);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = color;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.font = pixelFont(h * 0.3, 700);
      ctx.fillText(meta.locale === 'ko' ? '입장권' : 'TICKET', w * 0.08, h * 0.38);
      ctx.font = smallFont(h * 0.17);
      ctx.fillText(meta.date.replace(/-/g, '.'), w * 0.08, h * 0.7);
      ctx.textAlign = 'center';
      ctx.font = pixelFont(h * 0.34, 700);
      ctx.fillText('01', w * 0.83, h / 2);
      ctx.restore();
    },
  },
  {
    id: 'film',
    aspect: 0.72,
    draw: (ctx, w, h, color) => {
      ctx.fillStyle = '#26221d';
      roundRect(ctx, 0, 0, w, h, w * 0.04);
      ctx.fill();
      ctx.fillStyle = color;
      const holeW = w * 0.1;
      const holeH = h * 0.08;
      for (let i = 0; i < 4; i++) {
        const y = h * 0.08 + i * h * 0.24;
        roundRect(ctx, w * 0.04, y, holeW, holeH, holeH * 0.3);
        ctx.fill();
        roundRect(ctx, w - w * 0.04 - holeW, y, holeW, holeH, holeH * 0.3);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillRect(w * 0.2, h * 0.1, w * 0.6, h * 0.8);
    },
  },
  {
    id: 'speech',
    aspect: 0.74,
    draw: (ctx, w, h, color, meta) => {
      const bodyH = h * 0.78;
      ctx.fillStyle = '#fffdf7';
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(2, w * 0.03);
      roundRect(ctx, 0, 0, w, bodyH, w * 0.1);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(w * 0.24, bodyH - ctx.lineWidth / 2);
      ctx.lineTo(w * 0.2, h);
      ctx.lineTo(w * 0.44, bodyH - ctx.lineWidth / 2);
      ctx.closePath();
      ctx.fillStyle = '#fffdf7';
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = pixelFont(bodyH * 0.34, 700);
      ctx.fillText(meta.locale === 'ko' ? '좋아!' : 'NICE!', w / 2, bodyH * 0.5);
    },
  },
  {
    id: 'barcode-chip',
    aspect: 0.5,
    draw: (ctx, w, h, color, meta) => {
      ctx.fillStyle = '#fffdf7';
      roundRect(ctx, 0, 0, w, h, w * 0.05);
      ctx.fill();
      drawBarcode(ctx, w * 0.08, h * 0.14, w * 0.84, h * 0.52, meta.date, color);
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `400 ${h * 0.2}px ${FONT_FAMILY}`;
      ctx.fillText(meta.date.replace(/-/g, ''), w / 2, h * 0.82);
    },
  },
  {
    id: 'arrow',
    aspect: 0.62,
    draw: (ctx, w, h, color) => {
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = Math.max(3, w * 0.075);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(w * 0.08, h * 0.12);
      ctx.quadraticCurveTo(w * 0.9, h * 0.1, w * 0.62, h * 0.86);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(w * 0.62, h * 0.98);
      ctx.lineTo(w * 0.42, h * 0.62);
      ctx.lineTo(w * 0.84, h * 0.66);
      ctx.closePath();
      ctx.fill();
    },
  },
  {
    id: 'pixel-frame',
    aspect: 1,
    draw: (ctx, w, h, color) => {
      const unit = w / 12;
      ctx.fillStyle = color;
      for (let i = 0; i < 12; i++) {
        ctx.fillRect(i * unit, 0, unit, unit);
        ctx.fillRect(i * unit, h - unit, unit, unit);
        ctx.fillRect(0, i * unit, unit, unit);
        ctx.fillRect(w - unit, i * unit, unit, unit);
      }
      ctx.fillRect(unit, unit, unit, unit);
      ctx.fillRect(w - unit * 2, unit, unit, unit);
      ctx.fillRect(unit, h - unit * 2, unit, unit);
      ctx.fillRect(w - unit * 2, h - unit * 2, unit, unit);
    },
  },
];

const BUILTIN_MAP = new Map(BUILTINS.map((s) => [s.id, s]));

export const BUILTIN_STICKERS = BUILTINS;

export function getBuiltin(id: string): BuiltinSticker | undefined {
  return BUILTIN_MAP.get(id);
}

function imageSize(img: ImageSource): { w: number; h: number } {
  if (img instanceof HTMLImageElement) return { w: img.naturalWidth, h: img.naturalHeight };
  return { w: img.width, h: img.height };
}

/** Un-rotated footprint of a sticker in receipt space. */
export function stickerSize(ref: StickerRef, scale: number, res: Resources): { w: number; h: number } {
  if (ref.kind === 'builtin') {
    const def = getBuiltin(ref.id);
    const aspect = def?.aspect ?? 1;
    return { w: STICKER_BASE * scale, h: STICKER_BASE * scale * aspect };
  }
  const img = res.get(ref.imageId);
  if (!img) return { w: STICKER_BASE * scale, h: STICKER_BASE * scale };
  const { w, h } = imageSize(img);
  const longest = Math.max(w, h) || 1;
  return { w: (w / longest) * STICKER_BASE * scale, h: (h / longest) * STICKER_BASE * scale };
}

export function drawSticker(
  ctx: CanvasRenderingContext2D,
  sticker: Sticker,
  res: Resources,
  meta: StickerMeta,
): void {
  const { w, h } = stickerSize(sticker.ref, sticker.scale, res);
  ctx.save();
  ctx.translate(sticker.x, sticker.y);
  ctx.rotate(sticker.rotation);
  ctx.globalAlpha = sticker.opacity;
  ctx.translate(-w / 2, -h / 2);

  if (sticker.ref.kind === 'builtin') {
    const def = getBuiltin(sticker.ref.id);
    if (def) def.draw(ctx, w, h, sticker.color, meta);
  } else {
    const img = res.get(sticker.ref.imageId);
    if (img) ctx.drawImage(img as CanvasImageSource, 0, 0, w, h);
  }
  ctx.restore();
}
