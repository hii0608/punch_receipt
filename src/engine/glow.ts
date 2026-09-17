import type { GlowSettings } from './types';

let filterSupport: boolean | null = null;

function supportsCanvasFilter(ctx: CanvasRenderingContext2D): boolean {
  if (filterSupport !== null) return filterSupport;
  try {
    ctx.filter = 'blur(2px)';
    filterSupport = ctx.filter === 'blur(2px)';
    ctx.filter = 'none';
  } catch {
    filterSupport = false;
  }
  return filterSupport;
}

/** Builds the glow layer from the punch mask.
 *  The mask is blurred, tinted, and (optionally) has the holes themselves cut
 *  back out so only the rim around each hole lights up. */
export class GlowRenderer {
  private canvas = document.createElement('canvas');
  private scratch = document.createElement('canvas');

  render(
    mask: HTMLCanvasElement,
    settings: GlowSettings,
    color: string,
    scale: number,
  ): HTMLCanvasElement | null {
    if (!settings.enabled || settings.intensity <= 0 || mask.width === 0) return null;

    const { width, height } = mask;
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.scratch.width = width;
      this.scratch.height = height;
    }

    const ctx = this.canvas.getContext('2d');
    if (!ctx) return null;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, width, height);

    const radius = Math.max(1, settings.radius * scale);

    if (supportsCanvasFilter(ctx)) {
      ctx.filter = `blur(${radius}px)`;
      ctx.drawImage(mask, 0, 0);
      ctx.filter = 'none';
    } else {
      // Fallback: stack a few progressively larger, fainter copies.
      const steps = 5;
      for (let i = 1; i <= steps; i++) {
        const grow = (radius * i) / steps;
        ctx.globalAlpha = 0.45 / i;
        ctx.drawImage(
          mask,
          -grow,
          -grow,
          width + grow * 2,
          height + grow * 2,
        );
      }
      ctx.globalAlpha = 1;
    }

    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);

    if (settings.ringOnly) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.drawImage(mask, 0, 0);
    }

    ctx.globalCompositeOperation = 'source-over';
    return this.canvas;
  }
}

/** Draws a prepared glow layer additively so overlapping holes bloom. */
export function compositeGlow(
  ctx: CanvasRenderingContext2D,
  glow: HTMLCanvasElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  intensity: number,
): void {
  const passes = intensity > 1 ? 2 : 1;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < passes; i++) {
    ctx.globalAlpha = Math.min(1, i === 0 ? Math.min(1, intensity) : intensity - 1);
    ctx.drawImage(glow, dx, dy, dw, dh);
  }
  ctx.restore();
}
