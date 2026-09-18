import { useEffect, useRef } from 'react';
import { drawShape } from '@/engine/punch';
import type { ImageSource, PunchShape } from '@/engine/types';

export function ShapePreview({
  shape,
  size = 26,
  color = 'currentColor',
  custom,
  tint = true,
}: {
  shape: PunchShape;
  size?: number;
  color?: string;
  custom?: ImageSource | null;
  tint?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    const resolved = color === 'currentColor' ? getComputedStyle(canvas).color : color;
    drawShape(ctx, shape, size / 2, size / 2, size * 0.86, 0, tint ? resolved : undefined, custom);
  }, [shape, size, color, custom, tint]);

  return <canvas ref={ref} style={{ width: size, height: size }} aria-hidden />;
}
