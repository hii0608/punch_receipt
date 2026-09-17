import { useEffect, useRef } from 'react';
import { getBuiltin } from '@/engine/stickers';
import type { Locale } from '@/engine/types';

export function StickerThumb({
  id,
  color,
  date,
  locale,
  size = 46,
}: {
  id: string;
  color: string;
  date: string;
  locale: Locale;
  size?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const def = getBuiltin(id);
    if (!canvas || !def) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const h = size * def.aspect;
    canvas.width = size * dpr;
    canvas.height = h * dpr;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, h);
    def.draw(ctx, size, h, color, { date, locale });
  }, [id, color, date, locale, size]);

  return <canvas ref={ref} style={{ width: size }} aria-hidden />;
}
