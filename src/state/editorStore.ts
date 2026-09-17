import { create } from 'zustand';
import { GRADIENT_PRESETS } from '@/engine/presets';
import type {
  BackgroundFill,
  BrushSettings,
  GlowSettings,
  Locale,
  PaperStyle,
  ReceiptText,
  Scene,
  Sticker,
  StickerRef,
  Vec2,
} from '@/engine/types';
import { DICTIONARIES } from '@/i18n';

export const SCENE_WIDTH = 720;
const HISTORY_LIMIT = 40;

let idCounter = 0;
function uid(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter}`;
}

export function todayISO(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${mm}-${dd}`;
}

export function createScene(locale: Locale): Scene {
  const d = DICTIONARIES[locale].defaults;
  return {
    width: SCENE_WIDTH,
    paper: { color: '#FAF7F0', ink: '#3A352E', texture: true, serrated: true },
    background: GRADIENT_PRESETS[4]!.fill,
    photo: { imageId: null, offsetX: 0, offsetY: 0, scale: 1 },
    strokes: [],
    brush: { shape: 'sparkle', minSize: 18, maxSize: 46, spacing: 0.75, jitter: 0.35 },
    glow: { enabled: true, color: 'auto', radius: 14, intensity: 1, ringOnly: false },
    stickers: [],
    text: {
      title: d.title,
      date: todayISO(),
      captionLeft: d.captionLeft,
      captionRight: d.captionRight,
      tagline: d.tagline,
      footer: d.footer,
    },
    locale,
    showGrid: true,
    showBarcode: true,
  };
}

function clone(scene: Scene): Scene {
  return structuredClone(scene);
}

export type EditorState = {
  scene: Scene;
  past: Scene[];
  future: Scene[];
  selectedStickerId: string | null;
  activeStrokeId: string | null;

  commit: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  beginStroke: (point: Vec2) => void;
  extendStroke: (points: Vec2[]) => void;
  endStroke: () => void;
  clearPunches: () => void;

  setBrush: (patch: Partial<BrushSettings>) => void;
  setGlow: (patch: Partial<GlowSettings>) => void;
  setBackground: (fill: BackgroundFill) => void;
  patchBackground: (patch: Partial<Extract<BackgroundFill, { kind: 'image' }>>) => void;
  setPaper: (patch: Partial<PaperStyle>) => void;
  setText: (patch: Partial<ReceiptText>) => void;
  setFlag: (patch: Partial<Pick<Scene, 'showGrid' | 'showBarcode'>>) => void;

  setPhoto: (imageId: string | null) => void;
  setPhotoTransform: (patch: Partial<{ offsetX: number; offsetY: number; scale: number }>) => void;

  addSticker: (ref: StickerRef, at?: Vec2, color?: string) => string;
  updateSticker: (id: string, patch: Partial<Sticker>) => void;
  removeSticker: (id: string) => void;
  reorderSticker: (id: string, to: 'front' | 'back') => void;
  selectSticker: (id: string | null) => void;

  setLocale: (locale: Locale) => void;
  replaceScene: (scene: Scene) => void;
  reset: () => void;
};

const initialLocale: Locale = 'ko';

export const useEditor = create<EditorState>((set, get) => {
  /** Snapshots the current scene so the next mutation can be undone. */
  const pushHistory = (): void => {
    const { scene, past } = get();
    set({ past: [...past.slice(-HISTORY_LIMIT + 1), clone(scene)], future: [] });
  };

  const patchScene = (fn: (scene: Scene) => void, undoable = true): void => {
    if (undoable) pushHistory();
    const scene = clone(get().scene);
    fn(scene);
    set({ scene });
  };

  return {
    scene: createScene(initialLocale),
    past: [],
    future: [],
    selectedStickerId: null,
    activeStrokeId: null,

    commit: pushHistory,

    undo: () => {
      const { past, future, scene } = get();
      const prev = past[past.length - 1];
      if (!prev) return;
      set({
        past: past.slice(0, -1),
        future: [clone(scene), ...future].slice(0, HISTORY_LIMIT),
        scene: prev,
        selectedStickerId: null,
      });
    },

    redo: () => {
      const { past, future, scene } = get();
      const next = future[0];
      if (!next) return;
      set({
        past: [...past, clone(scene)].slice(-HISTORY_LIMIT),
        future: future.slice(1),
        scene: next,
        selectedStickerId: null,
      });
    },

    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0,

    beginStroke: (point) => {
      pushHistory();
      const id = uid('stroke');
      const scene = clone(get().scene);
      scene.strokes.push({ id, seed: Math.floor(Math.random() * 1e9), points: [point], ...scene.brush });
      set({ scene, activeStrokeId: id, selectedStickerId: null });
    },

    extendStroke: (points) => {
      const { activeStrokeId, scene } = get();
      if (!activeStrokeId || points.length === 0) return;
      const index = scene.strokes.findIndex((s) => s.id === activeStrokeId);
      if (index < 0) return;
      // Mutating the stroke in place keeps drawing allocation-free; a new scene
      // object is still handed to React so the canvas re-renders.
      const stroke = scene.strokes[index]!;
      stroke.points.push(...points);
      set({ scene: { ...scene } });
    },

    endStroke: () => set({ activeStrokeId: null }),

    clearPunches: () => patchScene((scene) => {
      scene.strokes = [];
    }),

    setBrush: (patch) => patchScene((scene) => {
      scene.brush = { ...scene.brush, ...patch };
    }, false),

    setGlow: (patch) => patchScene((scene) => {
      scene.glow = { ...scene.glow, ...patch };
    }, false),

    setBackground: (fill) => patchScene((scene) => {
      scene.background = fill;
    }),

    patchBackground: (patch) => patchScene((scene) => {
      if (scene.background.kind === 'image') scene.background = { ...scene.background, ...patch };
    }, false),

    setPaper: (patch) => patchScene((scene) => {
      scene.paper = { ...scene.paper, ...patch };
    }, false),

    setText: (patch) => patchScene((scene) => {
      scene.text = { ...scene.text, ...patch };
    }, false),

    setFlag: (patch) => patchScene((scene) => {
      Object.assign(scene, patch);
    }, false),

    setPhoto: (imageId) => patchScene((scene) => {
      scene.photo = { imageId, offsetX: 0, offsetY: 0, scale: 1 };
    }),

    setPhotoTransform: (patch) => patchScene((scene) => {
      scene.photo = { ...scene.photo, ...patch };
    }, false),

    addSticker: (ref, at, color) => {
      pushHistory();
      const id = uid('sticker');
      const scene = clone(get().scene);
      // Stagger stickers dropped without a position so they never hide each other.
      const n = scene.stickers.length;
      scene.stickers.push({
        id,
        ref,
        x: at?.x ?? scene.width * (0.34 + ((n % 3) * 0.16)),
        y: at?.y ?? scene.width * (0.62 + ((n % 4) * 0.1)),
        scale: 1,
        rotation: (Math.random() - 0.5) * 0.24,
        opacity: 1,
        color: color ?? '#C8503C',
      });
      set({ scene, selectedStickerId: id });
      return id;
    },

    updateSticker: (id, patch) => patchScene((scene) => {
      const sticker = scene.stickers.find((s) => s.id === id);
      if (sticker) Object.assign(sticker, patch);
    }, false),

    removeSticker: (id) => {
      pushHistory();
      const scene = clone(get().scene);
      scene.stickers = scene.stickers.filter((s) => s.id !== id);
      set({ scene, selectedStickerId: null });
    },

    reorderSticker: (id, to) => patchScene((scene) => {
      const index = scene.stickers.findIndex((s) => s.id === id);
      if (index < 0) return;
      const [sticker] = scene.stickers.splice(index, 1);
      if (!sticker) return;
      if (to === 'front') scene.stickers.push(sticker);
      else scene.stickers.unshift(sticker);
    }),

    selectSticker: (id) => set({ selectedStickerId: id }),

    setLocale: (locale) => {
      const { scene } = get();
      const previous = DICTIONARIES[scene.locale].defaults;
      const next = DICTIONARIES[locale].defaults;
      const updated = clone(scene);
      updated.locale = locale;
      // Only swap copy the user has not touched.
      if (updated.text.title === previous.title) updated.text.title = next.title;
      if (updated.text.captionLeft === previous.captionLeft) updated.text.captionLeft = next.captionLeft;
      if (updated.text.captionRight === previous.captionRight) updated.text.captionRight = next.captionRight;
      if (updated.text.tagline === previous.tagline) updated.text.tagline = next.tagline;
      if (updated.text.footer === previous.footer) updated.text.footer = next.footer;
      set({ scene: updated });
    },

    replaceScene: (scene) => set({ scene, past: [], future: [], selectedStickerId: null }),

    reset: () => set({
      scene: createScene(get().scene.locale),
      past: [],
      future: [],
      selectedStickerId: null,
      activeStrokeId: null,
    }),
  };
});

// Dev-only handle so end-to-end tests can read the editor's real state.
if (import.meta.env.DEV) {
  (window as unknown as { __punchStore?: typeof useEditor }).__punchStore = useEditor;
}
