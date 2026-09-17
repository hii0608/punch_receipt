import { useState } from 'react';
import { Group, Slider, Swatches } from './Controls';
import { StickerThumb } from './StickerThumb';
import { STICKER_COLORS } from '@/engine/presets';
import { BUILTIN_STICKERS } from '@/engine/stickers';
import { pickFile } from '@/lib/pickFile';
import { useEditor } from '@/state/editorStore';
import { images } from '@/state/imageStore';
import { useT } from '@/i18n';

export function StickerPanel() {
  const t = useT();
  const scene = useEditor((s) => s.scene);
  const selectedId = useEditor((s) => s.selectedStickerId);
  const addSticker = useEditor((s) => s.addSticker);
  const updateSticker = useEditor((s) => s.updateSticker);
  const removeSticker = useEditor((s) => s.removeSticker);
  const reorderSticker = useEditor((s) => s.reorderSticker);
  const [color, setColor] = useState(STICKER_COLORS[0]!);
  const [busy, setBusy] = useState(false);

  const selected = scene.stickers.find((s) => s.id === selectedId) ?? null;

  const importPng = async () => {
    const file = await pickFile('image/png,image/webp,image/jpeg');
    if (!file) return;
    setBusy(true);
    try {
      const imageId = await images.add(file);
      addSticker({ kind: 'image', imageId });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Group title={t.sticker.builtin}>
        <p className="hint">{t.sticker.empty}</p>
        <Swatches colors={STICKER_COLORS} value={color} onChange={setColor} />
        <div style={{ height: 12 }} />
        <div className="chipgrid">
          {BUILTIN_STICKERS.map((sticker) => (
            <button
              key={sticker.id}
              type="button"
              className="chip"
              aria-label={sticker.id}
              onClick={() => addSticker({ kind: 'builtin', id: sticker.id }, undefined, color)}
            >
              <StickerThumb id={sticker.id} color={color} date={scene.text.date} locale={scene.locale} />
            </button>
          ))}
        </div>
      </Group>

      <Group title={t.sticker.upload}>
        <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => void importPng()}>
          {t.sticker.upload}
        </button>
      </Group>

      {selected && (
        <Group title={t.sticker.selected}>
          <p className="hint">{t.sticker.hint}</p>
          <Slider
            label={t.sticker.size}
            min={0.25}
            max={4}
            step={0.02}
            value={selected.scale}
            format={(v) => `${v.toFixed(2)}×`}
            onChange={(scale) => updateSticker(selected.id, { scale })}
          />
          <Slider
            label={t.sticker.rotation}
            min={-180}
            max={180}
            value={(selected.rotation * 180) / Math.PI}
            format={(v) => `${Math.round(v)}°`}
            onChange={(deg) => updateSticker(selected.id, { rotation: (deg * Math.PI) / 180 })}
          />
          <Slider
            label={t.sticker.opacity}
            min={0.1}
            max={1}
            step={0.05}
            value={selected.opacity}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(opacity) => updateSticker(selected.id, { opacity })}
          />
          {selected.ref.kind === 'builtin' && (
            <>
              <p className="hint">{t.sticker.color}</p>
              <Swatches
                colors={STICKER_COLORS}
                value={selected.color}
                onChange={(next) => updateSticker(selected.id, { color: next })}
              />
              <div style={{ height: 12 }} />
            </>
          )}
          <div className="btn-row">
            <button type="button" className="btn btn--ghost" onClick={() => reorderSticker(selected.id, 'back')}>
              {t.action.back}
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => reorderSticker(selected.id, 'front')}>
              {t.action.front}
            </button>
          </div>
          <div style={{ height: 9 }} />
          <button type="button" className="btn btn--danger" onClick={() => removeSticker(selected.id)}>
            {t.action.delete}
          </button>
        </Group>
      )}
    </>
  );
}
