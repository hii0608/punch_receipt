import type { Rect, Scene } from './types';

/** Vertical flow of the receipt. Every block is positioned here and nowhere
 *  else, so the renderer, hit-testing and the export all agree on geometry. */
export type Layout = {
  width: number;
  height: number;
  pad: number;
  contentW: number;
  title: Rect;
  date: Rect;
  dividerTop: number;
  photo: Rect;
  grid: Rect | null;
  captions: Rect;
  tagline: Rect;
  dividerBottom: number;
  barcode: Rect | null;
  footer: Rect;
};

export const FONT_SIZES = {
  title: 30,
  date: 18,
  caption: 20,
  tagline: 20,
  footer: 15,
} as const;

const PHOTO_ASPECT = 0.75; // height / width
const GRID_ASPECT = 0.56;

export function computeLayout(scene: Scene): Layout {
  const width = scene.width;
  const pad = Math.round(width * 0.067);
  const contentW = width - pad * 2;
  let y = Math.round(width * 0.085);

  const title: Rect = { x: pad, y, w: contentW, h: FONT_SIZES.title * 1.3 };
  y += title.h + 8;

  const date: Rect = { x: pad, y, w: contentW, h: FONT_SIZES.date * 1.4 };
  y += date.h + 22;

  const dividerTop = y;
  y += 24;

  const photo: Rect = { x: pad, y, w: contentW, h: Math.round(contentW * PHOTO_ASPECT) };
  y += photo.h;

  let grid: Rect | null = null;
  if (scene.showGrid) {
    grid = { x: pad, y, w: contentW, h: Math.round(contentW * GRID_ASPECT) };
    y += grid.h;
  }
  y += 30;

  const captions: Rect = { x: pad, y, w: contentW, h: FONT_SIZES.caption * 1.4 };
  y += captions.h + 26;

  const tagline: Rect = { x: pad, y, w: contentW, h: FONT_SIZES.tagline * 1.4 };
  y += tagline.h + 28;

  const dividerBottom = y;
  y += 30;

  let barcode: Rect | null = null;
  if (scene.showBarcode) {
    const bw = Math.round(contentW * 0.46);
    barcode = { x: Math.round((width - bw) / 2), y, w: bw, h: 64 };
    y += barcode.h + 14;
  }

  const footer: Rect = { x: pad, y, w: contentW, h: FONT_SIZES.footer * 1.4 };
  y += footer.h + Math.round(width * 0.075);

  return {
    width,
    height: Math.round(y),
    pad,
    contentW,
    title,
    date,
    dividerTop,
    photo,
    grid,
    captions,
    tagline,
    dividerBottom,
    barcode,
    footer,
  };
}
