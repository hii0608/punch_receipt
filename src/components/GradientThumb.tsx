import { useEffect, useRef } from 'react';
import { paintBackground } from '@/engine/background';
import type { BackgroundFill } from '@/engine/types';
import { images } from '@/state/imageStore';

export function GradientThumb({ fill, size = 40 }: { fill: BackgroundFill; size?: number }) {
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
    paintBackground(ctx, size, size, fill, images);
  }, [fill, size]);

  return <canvas ref={ref} style={{ width: size, height: size, borderRadius: 8 }} aria-hidden />;
}
