import { Group, Slider, Swatches, Toggle } from './Controls';
import { ShapePreview } from './ShapePreview';
import { PUNCH_SHAPES } from '@/engine/punch';
import { SOLID_PALETTE } from '@/engine/presets';
import { useEditor } from '@/state/editorStore';
import { useT } from '@/i18n';

export function PunchPanel() {
  const t = useT();
  const brush = useEditor((s) => s.scene.brush);
  const glow = useEditor((s) => s.scene.glow);
  const hasPunches = useEditor((s) => s.scene.strokes.length > 0);
  const setBrush = useEditor((s) => s.setBrush);
  const setGlow = useEditor((s) => s.setGlow);
  const clearPunches = useEditor((s) => s.clearPunches);

  return (
    <>
      <Group title={t.punch.title}>
        <p className="hint">{t.punch.hint}</p>
        <div className="chipgrid">
          {PUNCH_SHAPES.map((shape) => (
            <button
              key={shape}
              type="button"
              className="chip"
              aria-pressed={brush.shape === shape}
              onClick={() => setBrush({ shape })}
            >
              <ShapePreview shape={shape} />
              <span>{t.punch.shapeName[shape]}</span>
            </button>
          ))}
        </div>
      </Group>

      <Group title={t.punch.sizeRange}>
        <Slider
          label={t.punch.minSize}
          min={6}
          max={90}
          value={brush.minSize}
          onChange={(v) => setBrush({ minSize: v, maxSize: Math.max(v, brush.maxSize) })}
        />
        <Slider
          label={t.punch.maxSize}
          min={6}
          max={130}
          value={brush.maxSize}
          onChange={(v) => setBrush({ maxSize: v, minSize: Math.min(v, brush.minSize) })}
        />
        <Slider
          label={t.punch.spacing}
          min={0.4}
          max={4}
          step={0.05}
          value={brush.spacing}
          format={(v) => v.toFixed(2)}
          onChange={(v) => setBrush({ spacing: v })}
        />
        <Slider
          label={t.punch.jitter}
          min={0}
          max={1.5}
          step={0.05}
          value={brush.jitter}
          format={(v) => v.toFixed(2)}
          onChange={(v) => setBrush({ jitter: v })}
        />
        <button type="button" className="btn btn--ghost" disabled={!hasPunches} onClick={clearPunches}>
          {t.action.clearPunches}
        </button>
      </Group>

      <Group title={t.glow.title}>
        <Toggle label={t.glow.enabled} checked={glow.enabled} onChange={(enabled) => setGlow({ enabled })} />
        <Toggle label={t.glow.ringOnly} checked={glow.ringOnly} onChange={(ringOnly) => setGlow({ ringOnly })} />
        <Slider
          label={t.glow.intensity}
          min={0}
          max={2}
          step={0.05}
          value={glow.intensity}
          format={(v) => v.toFixed(2)}
          onChange={(v) => setGlow({ intensity: v })}
        />
        <Slider
          label={t.glow.radius}
          min={2}
          max={48}
          value={glow.radius}
          onChange={(v) => setGlow({ radius: v })}
        />
        <div className="row row--wrap">
          <span className="row__label">{t.glow.color}</span>
          <button
            type="button"
            className="iconbtn iconbtn--sm"
            aria-pressed={glow.color === 'auto'}
            style={glow.color === 'auto' ? { background: 'var(--ink)', color: 'var(--accent-contrast)' } : undefined}
            onClick={() => setGlow({ color: 'auto' })}
          >
            {t.glow.auto}
          </button>
        </div>
        <Swatches
          colors={SOLID_PALETTE}
          value={glow.color === 'auto' ? '#ffffff' : glow.color}
          onChange={(color) => setGlow({ color })}
        />
      </Group>
    </>
  );
}
