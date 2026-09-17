import { useState } from 'react';
import { Field, Group, Slider, Swatches, Toggle } from './Controls';
import { INK_COLORS, PAPER_COLORS } from '@/engine/presets';
import { pickFile } from '@/lib/pickFile';
import { useEditor } from '@/state/editorStore';
import { images } from '@/state/imageStore';
import { useT } from '@/i18n';

export function ReceiptPanel() {
  const t = useT();
  const text = useEditor((s) => s.scene.text);
  const paper = useEditor((s) => s.scene.paper);
  const photo = useEditor((s) => s.scene.photo);
  const showGrid = useEditor((s) => s.scene.showGrid);
  const showBarcode = useEditor((s) => s.scene.showBarcode);
  const setText = useEditor((s) => s.setText);
  const setPaper = useEditor((s) => s.setPaper);
  const setFlag = useEditor((s) => s.setFlag);
  const setPhoto = useEditor((s) => s.setPhoto);
  const setPhotoTransform = useEditor((s) => s.setPhotoTransform);
  const [busy, setBusy] = useState(false);

  const uploadPhoto = async () => {
    const file = await pickFile();
    if (!file) return;
    setBusy(true);
    try {
      setPhoto(await images.add(file));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Group title={t.photo.adjust}>
        <div className="btn-row">
          <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => void uploadPhoto()}>
            {photo.imageId ? t.action.replacePhoto : t.action.uploadPhoto}
          </button>
          {photo.imageId && (
            <button type="button" className="btn btn--ghost" onClick={() => setPhoto(null)}>
              {t.action.removePhoto}
            </button>
          )}
        </div>
        {photo.imageId && (
          <div style={{ marginTop: 12 }}>
            <Slider
              label={t.photo.zoom}
              min={1}
              max={3}
              step={0.02}
              value={photo.scale}
              format={(v) => `${v.toFixed(2)}×`}
              onChange={(scale) => setPhotoTransform({ scale })}
            />
            <Slider
              label={t.photo.offsetX}
              min={-0.5}
              max={0.5}
              step={0.01}
              value={photo.offsetX}
              format={(v) => v.toFixed(2)}
              onChange={(offsetX) => setPhotoTransform({ offsetX })}
            />
            <Slider
              label={t.photo.offsetY}
              min={-0.5}
              max={0.5}
              step={0.01}
              value={photo.offsetY}
              format={(v) => v.toFixed(2)}
              onChange={(offsetY) => setPhotoTransform({ offsetY })}
            />
          </div>
        )}
      </Group>

      <Group title={t.receipt.title}>
        <Field label={t.receipt.heading} value={text.title} maxLength={24} onChange={(title) => setText({ title })} />
        <Field label={t.receipt.date} type="date" value={text.date} onChange={(date) => setText({ date })} />
        <div className="field--split" style={{ display: 'flex', gap: 10 }}>
          <Field
            label={t.receipt.captionLeft}
            value={text.captionLeft}
            maxLength={18}
            onChange={(captionLeft) => setText({ captionLeft })}
          />
          <Field
            label={t.receipt.captionRight}
            value={text.captionRight}
            maxLength={18}
            onChange={(captionRight) => setText({ captionRight })}
          />
        </div>
        <Field
          label={t.receipt.taglineField}
          value={text.tagline}
          maxLength={40}
          onChange={(tagline) => setText({ tagline })}
        />
        <Field label={t.receipt.footer} value={text.footer} maxLength={20} onChange={(footer) => setText({ footer })} />
        <Toggle label={t.receipt.showGrid} checked={showGrid} onChange={(v) => setFlag({ showGrid: v })} />
        <Toggle label={t.receipt.showBarcode} checked={showBarcode} onChange={(v) => setFlag({ showBarcode: v })} />
      </Group>

      <Group title={t.receipt.paper}>
        <p className="hint">{t.receipt.paperColor}</p>
        <Swatches colors={PAPER_COLORS} value={paper.color} onChange={(color) => setPaper({ color })} />
        <div style={{ height: 12 }} />
        <p className="hint">{t.receipt.inkColor}</p>
        <Swatches colors={INK_COLORS} value={paper.ink} onChange={(ink) => setPaper({ ink })} />
        <div style={{ height: 8 }} />
        <Toggle label={t.receipt.texture} checked={paper.texture} onChange={(texture) => setPaper({ texture })} />
        <Toggle label={t.receipt.serrated} checked={paper.serrated} onChange={(serrated) => setPaper({ serrated })} />
      </Group>
    </>
  );
}
