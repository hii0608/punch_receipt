import type { ImageSource, Resources } from '@/engine/types';

const MAX_EDGE = 2048;

let counter = 0;
function nextId(): string {
  counter += 1;
  return `img_${Date.now().toString(36)}_${counter}`;
}

async function decode(blob: Blob): Promise<ImageSource> {
  if (typeof createImageBitmap === 'function') {
    try {
      // 'from-image' applies the EXIF orientation for us.
      return await createImageBitmap(blob, { imageOrientation: 'from-image' });
    } catch {
      /* fall through to <img> decoding */
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    // The bitmap is already decoded into the element by the time we revoke.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}

function sizeOf(img: ImageSource): { w: number; h: number } {
  if (img instanceof HTMLImageElement) return { w: img.naturalWidth, h: img.naturalHeight };
  return { w: img.width, h: img.height };
}

/** Large phone photos are downscaled once on import; mobile Safari runs out of
 *  memory fast when several 12MP bitmaps are composited every frame. */
function downscale(img: ImageSource): ImageSource {
  const { w, h } = sizeOf(img);
  const longest = Math.max(w, h);
  if (!longest || longest <= MAX_EDGE) return img;
  const ratio = MAX_EDGE / longest;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * ratio);
  canvas.height = Math.round(h * ratio);
  const ctx = canvas.getContext('2d');
  if (!ctx) return img;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img as CanvasImageSource, 0, 0, canvas.width, canvas.height);
  if (img instanceof ImageBitmap) img.close();
  return canvas;
}

/** Bitmaps keyed by id. Kept out of the scene so the scene stays serializable. */
class ImageRegistry implements Resources {
  private images = new Map<string, ImageSource>();
  private blobs = new Map<string, Blob>();

  get(id: string): ImageSource | undefined {
    return this.images.get(id);
  }

  getBlob(id: string): Blob | undefined {
    return this.blobs.get(id);
  }

  has(id: string): boolean {
    return this.images.has(id);
  }

  async add(blob: Blob, id = nextId()): Promise<string> {
    const decoded = downscale(await decode(blob));
    this.images.set(id, decoded);
    this.blobs.set(id, blob);
    return id;
  }

  /** Ids still referenced by a scene, used when saving a session. */
  entries(): [string, Blob][] {
    return [...this.blobs.entries()];
  }

  release(id: string): void {
    const img = this.images.get(id);
    if (img instanceof ImageBitmap) img.close();
    this.images.delete(id);
    this.blobs.delete(id);
  }
}

export const images = new ImageRegistry();
