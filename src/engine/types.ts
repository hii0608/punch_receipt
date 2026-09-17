/** Receipt-space coordinates. The scene is authored at a fixed width and the
 *  renderer scales it up for export, so every number here is "receipt pixels". */
export type Vec2 = { x: number; y: number };

export type PunchShape = 'circle' | 'square' | 'star' | 'heart' | 'thumb' | 'sparkle' | 'flower';

export type GradientStop = { offset: number; color: string };

export type BackgroundFill =
  | { kind: 'solid'; color: string }
  | {
      kind: 'gradient';
      type: 'linear' | 'radial';
      angle: number; // degrees, 0 = left→right
      stops: GradientStop[];
    }
  | { kind: 'image'; imageId: string; offsetX: number; offsetY: number; scale: number };

/** A single freehand punch stroke. Stored as raw input points plus the brush
 *  settings and a seed: stamps are re-derived deterministically at any scale,
 *  which is what lets the 1x preview and the 3x export match exactly. */
export type Stroke = {
  id: string;
  shape: PunchShape;
  /** false punches every hole at maxSize; true varies it across the range. */
  randomSize: boolean;
  minSize: number;
  maxSize: number;
  spacing: number; // distance between stamps, as a fraction of average size
  jitter: number; // perpendicular scatter, as a fraction of average size
  seed: number;
  points: Vec2[];
};

/** Brush settings used for new strokes (and echoed by the swatch grid block). */
export type BrushSettings = {
  shape: PunchShape;
  randomSize: boolean;
  minSize: number;
  maxSize: number;
  spacing: number;
  jitter: number;
};

export type GlowSettings = {
  enabled: boolean;
  /** 'auto' samples the background so the glow matches what shows through. */
  color: string | 'auto';
  radius: number;
  intensity: number;
  ringOnly: boolean;
};

export type StickerRef =
  | { kind: 'builtin'; id: string }
  | { kind: 'image'; imageId: string };

export type Sticker = {
  id: string;
  ref: StickerRef;
  x: number;
  y: number;
  scale: number;
  rotation: number; // radians
  opacity: number;
  color: string; // tint for builtin stickers, ignored for images
};

export type PlacedImage = {
  imageId: string | null;
  offsetX: number;
  offsetY: number;
  scale: number;
};

export type ReceiptText = {
  title: string;
  date: string; // ISO yyyy-mm-dd
  captionLeft: string;
  captionRight: string;
  tagline: string;
  footer: string;
};

export type PaperStyle = {
  color: string;
  ink: string;
  texture: boolean;
  serrated: boolean;
};

export type Locale = 'ko' | 'en';

export type Scene = {
  width: number;
  paper: PaperStyle;
  background: BackgroundFill;
  photo: PlacedImage;
  strokes: Stroke[];
  brush: BrushSettings;
  glow: GlowSettings;
  stickers: Sticker[];
  text: ReceiptText;
  locale: Locale;
  showGrid: boolean;
  showBarcode: boolean;
};

/** Bitmaps live outside the scene so the scene itself stays JSON-serializable. */
export type ImageSource = HTMLImageElement | ImageBitmap | HTMLCanvasElement;

export interface Resources {
  get(imageId: string): ImageSource | undefined;
}

export type Rect = { x: number; y: number; w: number; h: number };
