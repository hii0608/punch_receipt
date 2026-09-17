import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { fontsReady } from '@/engine/fonts';
import { drawStickerSelection, handlePosition, hitHandle, hitSticker } from '@/engine/hittest';
import { computeLayout } from '@/engine/layout';
import { ReceiptRenderer } from '@/engine/render';
import { stickerSize } from '@/engine/stickers';
import type { Vec2 } from '@/engine/types';
import { images } from '@/state/imageStore';
import { useEditor } from '@/state/editorStore';
import { useT } from '@/i18n';

export type CanvasMode = 'punch' | 'sticker' | 'view';

const MAX_CSS_WIDTH = 460;

type DragState =
  | { kind: 'punch' }
  | { kind: 'sticker-move'; id: string; grabX: number; grabY: number }
  | { kind: 'sticker-transform'; id: string; startAngle: number; startRotation: number; startDist: number; startScale: number }
  | null;

export function ReceiptCanvas({
  mode,
  onRequestPhoto,
}: {
  mode: CanvasMode;
  onRequestPhoto: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<ReceiptRenderer | null>(null);
  const frameRef = useRef(0);
  const dragRef = useRef<DragState>(null);
  const [cssWidth, setCssWidth] = useState(360);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const t = useT();

  const scene = useEditor((s) => s.scene);
  const selectedStickerId = useEditor((s) => s.selectedStickerId);
  const layout = computeLayout(scene);

  useEffect(() => {
    let alive = true;
    void fontsReady().then(() => alive && setFontsLoaded(true));
    return () => {
      alive = false;
    };
  }, []);

  // Fit the receipt to the available stage width.
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const parent = wrap.parentElement;
    if (!parent) return;
    // Fit to the available width only: fitting to height as well makes the
    // stage grow and shrink in a loop as the scrollbar appears and vanishes.
    const measure = () => setCssWidth(Math.max(240, Math.min(MAX_CSS_WIDTH, parent.clientWidth)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  const cssHeight = (cssWidth * layout.height) / scene.width;

  // The receipt is taller than the stage, so bring the photo block into view
  // when the user switches to punching or drops in a new photo.
  useEffect(() => {
    if (mode !== 'punch') return;
    const wrap = wrapRef.current;
    const parent = wrap?.parentElement;
    if (!wrap || !parent) return;
    const scale = cssWidth / scene.width;
    // Offset of the wrapper inside the scroll container (offsetTop would be
    // relative to the nearest positioned ancestor, which is not the stage).
    const wrapTop = wrap.getBoundingClientRect().top - parent.getBoundingClientRect().top + parent.scrollTop;
    const top = wrapTop + layout.photo.y * scale;
    const height = layout.photo.h * scale;
    const viewTop = parent.scrollTop;
    const viewBottom = viewTop + parent.clientHeight;
    if (top >= viewTop && top + height <= viewBottom) return;
    parent.scrollTo({
      top: Math.max(0, top - Math.max(0, (parent.clientHeight - height) / 2)),
      behavior: 'smooth',
    });
  }, [mode, scene.photo.imageId, cssWidth, scene.width, layout.photo.y, layout.photo.h]);

  // Draw (rAF-coalesced so a fast drag never queues more work than one frame).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    rendererRef.current ??= new ReceiptRenderer();
    const renderer = rendererRef.current;
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const scale = (cssWidth / scene.width) * dpr;
      const pxW = Math.round(cssWidth * dpr);
      const pxH = Math.round(cssHeight * dpr);
      if (canvas.width !== pxW || canvas.height !== pxH) {
        canvas.width = pxW;
        canvas.height = pxH;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      renderer.render(ctx, scene, images, scale, {
        placeholder: scene.photo.imageId ? undefined : t.photo.placeholder,
      });
      const selected = scene.stickers.find((s) => s.id === selectedStickerId);
      if (selected && mode === 'sticker') {
        ctx.save();
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        drawStickerSelection(ctx, selected, images);
        ctx.restore();
      }
    });
    return () => cancelAnimationFrame(frameRef.current);
  }, [scene, selectedStickerId, cssWidth, cssHeight, mode, t, fontsLoaded]);

  const toScene = useCallback(
    (clientX: number, clientY: number): Vec2 => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((clientX - rect.left) / rect.width) * scene.width,
        y: ((clientY - rect.top) / rect.height) * layout.height,
      };
    },
    [scene.width, layout.height],
  );

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (mode === 'view') return;
      const store = useEditor.getState();
      const p = toScene(event.clientX, event.clientY);

      if (mode === 'sticker') {
        const selected = store.scene.stickers.find((s) => s.id === store.selectedStickerId);
        if (selected) {
          const handle = hitHandle(selected, p, images);
          if (handle === 'delete') {
            store.removeSticker(selected.id);
            return;
          }
          if (handle === 'transform') {
            event.currentTarget.setPointerCapture(event.pointerId);
            dragRef.current = {
              kind: 'sticker-transform',
              id: selected.id,
              startAngle: Math.atan2(p.y - selected.y, p.x - selected.x),
              startRotation: selected.rotation,
              startDist: Math.max(1, Math.hypot(p.x - selected.x, p.y - selected.y)),
              startScale: selected.scale,
            };
            store.commit();
            return;
          }
        }
        const hit = hitSticker(store.scene, images, p);
        store.selectSticker(hit?.id ?? null);
        if (hit) {
          event.currentTarget.setPointerCapture(event.pointerId);
          dragRef.current = { kind: 'sticker-move', id: hit.id, grabX: p.x - hit.x, grabY: p.y - hit.y };
          store.commit();
        }
        return;
      }

      // Punch mode.
      const { photo } = layout;
      const inside = p.x >= photo.x && p.x <= photo.x + photo.w && p.y >= photo.y && p.y <= photo.y + photo.h;
      if (!inside) return;
      if (!store.scene.photo.imageId) {
        onRequestPhoto();
        return;
      }
      event.currentTarget.setPointerCapture(event.pointerId);
      dragRef.current = { kind: 'punch' };
      store.beginStroke({ x: p.x - photo.x, y: p.y - photo.y });
    },
    [mode, toScene, layout, onRequestPhoto],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const drag = dragRef.current;
      if (!drag) return;
      const store = useEditor.getState();

      if (drag.kind === 'punch') {
        const native = event.nativeEvent;
        const events = typeof native.getCoalescedEvents === 'function' ? native.getCoalescedEvents() : [native];
        const points = (events.length ? events : [native]).map((e) => {
          const p = toScene(e.clientX, e.clientY);
          return { x: p.x - layout.photo.x, y: p.y - layout.photo.y };
        });
        store.extendStroke(points);
        return;
      }

      const p = toScene(event.clientX, event.clientY);
      if (drag.kind === 'sticker-move') {
        store.updateSticker(drag.id, { x: p.x - drag.grabX, y: p.y - drag.grabY });
        return;
      }

      const sticker = store.scene.stickers.find((s) => s.id === drag.id);
      if (!sticker) return;
      const angle = Math.atan2(p.y - sticker.y, p.x - sticker.x);
      const dist = Math.max(1, Math.hypot(p.x - sticker.x, p.y - sticker.y));
      store.updateSticker(drag.id, {
        rotation: drag.startRotation + (angle - drag.startAngle),
        scale: Math.max(0.25, Math.min(4, (drag.startScale * dist) / drag.startDist)),
      });
    },
    [toScene, layout.photo.x, layout.photo.y],
  );

  const endDrag = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (drag.kind === 'punch') useEditor.getState().endStroke();
  }, []);

  const selected = scene.stickers.find((s) => s.id === selectedStickerId);
  const handleHint =
    mode === 'sticker' && selected
      ? handlePosition(selected, stickerSize(selected.ref, selected.scale, images), 'transform')
      : null;

  return (
    <div className="stage__inner" ref={wrapRef} style={{ width: cssWidth }}>
      <canvas
        ref={canvasRef}
        className="receipt-canvas"
        style={{ width: cssWidth, height: cssHeight, cursor: mode === 'punch' ? 'crosshair' : 'default' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        aria-label={t.appName}
      />
      {mode === 'punch' && <p className="stage__hint">{t.punch.hint}</p>}
      {mode === 'sticker' && !handleHint && <p className="stage__hint">{t.sticker.hint}</p>}
    </div>
  );
}
