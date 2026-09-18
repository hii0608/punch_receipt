/** Receipt-space coordinates. The scene is authored at a fixed width and the
 * renderer scales it up for export, so every number here is "receipt pixels". */
export type Vec2 = { x: number; y: number };

export type PunchShape =
  | 'circle'
  | 'square'
  | 'star'
  | 'heart'
  | 'thumb'
  | 'sparkle'
  | 'twinkle'
  | 'burst'
  | 'diamond'
  | 'clover'
  | 'asterisk'
  | 'flower'
  | 'custom';

export type GradientStop = { offset: number; color: string };

export type BackgroundFill =
  | { kind: 'solid'; color: string }
  | {
      kind: 'gradient';
      type: 'linear' | 'radial';
      angle: number;
      stops: GradientStop[];
    }
  | { kind: 'image'; imageId: string; offsetX: number; offsetY: number; scale: number };

export type Stroke = {
  id: string;
  shape: PunchShape;
  randomSize: boolean;
  minSize: number;
  maxSize: number;
  spacing: number;
  jitter: number;
  seed: number;
  points: Vec2[];
  customImageId?: string | null;
};

export type BrushSettings = {
  shape: PunchShape;
  randomSize: boolean;
  minSize: number;
  maxSize: number;
  spacing: number;
  jitter: number;
  customImageId?: string | null;
};

export type GlowSettings = {
  enabled: boolean;
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
  rotation: number;
  opacity: number;
  color: string;
};

export type PlacedImage = {
  imageId: string | null;
  offsetX: number;
  offsetY: number;
  scale: number;
};

export type ReceiptText = {
  title: string;
  date: string;
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
  customPunchIds: string[];
};

export type ImageSource = HTMLImageElement | ImageBitmap | HTMLCanvasElement;

export interface Resources {
  get(imageId: string): ImageSource | undefined;
}

export type Rect = { x: number; y: number; w: number; h: number };
