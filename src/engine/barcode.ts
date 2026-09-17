/** Decorative barcode. Not a scannable symbology — it renders a stable,
 *  seed-derived bar pattern so the same receipt always prints the same code. */
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function drawBarcode(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  seedText: string,
  color: string,
): void {
  let state = hash(seedText) || 1;
  const next = (): number => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };

  const unit = Math.max(1, w / 60);
  ctx.save();
  ctx.fillStyle = color;
  let cursor = x;
  // Quiet zone, guard bars, data, guard bars.
  const emit = (widthUnits: number, filled: boolean) => {
    const bw = widthUnits * unit;
    if (filled && cursor + bw <= x + w) ctx.fillRect(cursor, y, bw, h);
    cursor += bw;
  };
  emit(1, true);
  emit(1, false);
  emit(1, true);
  while (cursor < x + w - unit * 4) {
    const bars = 1 + Math.floor(next() * 3);
    emit(bars, true);
    emit(1 + Math.floor(next() * 2), false);
  }
  emit(1, true);
  emit(1, false);
  emit(1, true);
  ctx.restore();
}
