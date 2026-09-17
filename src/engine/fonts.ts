export const FONT_FAMILY = '"Galmuri11", "Courier New", monospace';
export const FONT_FAMILY_SMALL = '"Galmuri9", "Courier New", monospace';
export const FONT_FAMILY_MONO = '"GalmuriMono9", "Courier New", monospace';

export function pixelFont(size: number, weight: 400 | 700 = 400): string {
  return `${weight} ${size}px ${FONT_FAMILY}`;
}

export function smallFont(size: number): string {
  return `400 ${size}px ${FONT_FAMILY_SMALL}`;
}

export function monoFont(size: number): string {
  return `400 ${size}px ${FONT_FAMILY_MONO}`;
}

let ready: Promise<void> | null = null;

/** Canvas text silently falls back to a system font if the webfont has not
 *  loaded yet, so every render path awaits this once. */
export function fontsReady(): Promise<void> {
  if (!ready) {
    const faces = ['16px "Galmuri11"', '700 16px "Galmuri11"', '16px "Galmuri9"', '16px "GalmuriMono9"'];
    ready = (async () => {
      if (typeof document === 'undefined' || !document.fonts) return;
      try {
        await Promise.all(faces.map((f) => document.fonts.load(f, '가Aa0')));
        await document.fonts.ready;
      } catch {
        /* fall back to system monospace */
      }
    })();
  }
  return ready;
}
