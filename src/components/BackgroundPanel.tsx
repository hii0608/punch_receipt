import { useState } from 'react';
import { Group, Segmented, Slider, Swatches } from './Controls';
import { GradientThumb } from './GradientThumb';
import { GRADIENT_PRESETS, SOLID_PALETTE } from '@/engine/presets';
import type { BackgroundFill } from '@/engine/types';
import { pickFile } from '@/lib/pickFile';
import { useEditor } from '@/state/editorStore';
import { images } from '@/state/imageStore';
import { useT } from '@/i18n';

type Kind = BackgroundFill['kind'];

export function BackgroundPanel() {
  const t = useT();
  const background = useEditor((s) => s.scene.background);
  const setBackground = useEditor((s) => s.setBackground);
  const patchBackground = useEditor((s) => s.patchBackground);
  const [busy, setBusy] = useState(false);

  const switchKind = (kind: Kind) => {
    if (kind === background.kind) return;
    if (kind === 'solid') setBackground({ kind: 'solid', color: SOLID_PALETTE[0]! });
    else if (kind === 'gradient') setBackground(GRADIENT_PRESETS[0]!.fill);
    else void uploadImage();
  };

  const uploadImage = async () => {
    const file = await pickFile();
    if (!file) return;
    setBusy(true);
    try {
      const id = await images.add(file);
      setBackground({ kind: 'image', imageId: id, offsetX: 0, offsetY: 0, scale: 1 });
    } finally {
      setBusy(false);
    }
  };

  const updateStop = (index: number, patch: { color?: string; offset?: number }) => {
    if (background.kind !== 'gradient') return;
    const stops = background.stops.map((stop, i) => (i === index ? { ...stop, ...patch } : stop));
    setBackground({ ...background, stops });
  };

  return (
    <>
      <Group title={t.background.title}>
        <p className="hint">{t.background.hint}</p>
        <Segmented<Kind>
          value={background.kind}
          onChange={switchKind}
          options={[
            { value: 'solid', label: t.background.solid },
            { value: 'gradient', label: t.background.gradient },
            { value: 'image', label: t.background.image },
          ]}
        />
      </Group>

      {background.kind === 'solid' && (
        <Group>
          <Swatches
            colors={SOLID_PALETTE}
            value={background.color}
            onChange={(color) => setBackground({ kind: 'solid', color })}
          />
        </Group>
      )}

      {background.kind === 'gradient' && (
        <>
          <Group title={t.background.presets}>
            <div className="chipgrid">
              {GRADIENT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className="chip"
                  onClick={() => setBackground(preset.fill)}
                  aria-label={preset.id}
                >
                  <GradientThumb fill={preset.fill} />
                </button>
              ))}
            </div>
          </Group>

          <Group>
            <Segmented
              value={background.type}
              onChange={(type) => setBackground({ ...background, type })}
              options={[
                { value: 'linear' as const, label: t.background.linear },
                { value: 'radial' as const, label: t.background.radial },
              ]}
            />
            {background.type === 'linear' && (
              <Slider
                label={t.background.angle}
                min={0}
                max={360}
                value={background.angle}
                format={(v) => `${Math.round(v)}°`}
                onChange={(angle) => setBackground({ ...background, angle })}
              />
            )}
            {background.stops.map((stop, index) => (
              <div className="row" key={index}>
                <span className="swatch swatch--custom" style={{ flex: 'none' }}>
                  <input
                    type="color"
                    value={stop.color}
                    aria-label={`stop ${index + 1}`}
                    onChange={(e) => updateStop(index, { color: e.target.value })}
                  />
                </span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={stop.offset}
                  aria-label={`stop ${index + 1} position`}
                  onChange={(e) => updateStop(index, { offset: Number(e.target.value) })}
                />
                <button
                  type="button"
                  className="iconbtn iconbtn--sm"
                  disabled={background.stops.length <= 2}
                  aria-label={t.background.removeStop}
                  onClick={() =>
                    setBackground({ ...background, stops: background.stops.filter((_, i) => i !== index) })
                  }
                >
                  −
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn btn--ghost"
              disabled={background.stops.length >= 5}
              onClick={() =>
                setBackground({
                  ...background,
                  stops: [...background.stops, { offset: 1, color: '#ffffff' }],
                })
              }
            >
              + {t.background.addStop}
            </button>
          </Group>
        </>
      )}

      {background.kind === 'image' && (
        <Group>
          <button type="button" className="btn btn--ghost" onClick={() => void uploadImage()} disabled={busy}>
            {t.background.upload}
          </button>
          <div style={{ height: 12 }} />
          <Slider
            label={t.background.zoom}
            min={1}
            max={3}
            step={0.02}
            value={background.scale}
            format={(v) => `${v.toFixed(2)}×`}
            onChange={(scale) => patchBackground({ scale })}
          />
          <Slider
            label={t.photo.offsetX}
            min={-0.5}
            max={0.5}
            step={0.01}
            value={background.offsetX}
            format={(v) => v.toFixed(2)}
            onChange={(offsetX) => patchBackground({ offsetX })}
          />
          <Slider
            label={t.photo.offsetY}
            min={-0.5}
            max={0.5}
            step={0.01}
            value={background.offsetY}
            format={(v) => v.toFixed(2)}
            onChange={(offsetY) => patchBackground({ offsetY })}
          />
        </Group>
      )}
    </>
  );
}
