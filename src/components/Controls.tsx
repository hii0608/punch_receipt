import type { ReactNode } from 'react';

export function Group({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="group">
      {title && (
        <h2 className="group__title">
          <span>{title}</span>
          {action}
        </h2>
      )}
      {children}
    </section>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="row">
      <span className="row__label">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="row__value">{format ? format(value) : Math.round(value)}</span>
    </label>
  );
}

export function Field({
  label,
  value,
  onChange,
  type = 'text',
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'date';
  maxLength?: number;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <input type={type} value={value} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="seg" role="group">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Swatches({
  colors,
  value,
  onChange,
  allowCustom = true,
}: {
  colors: string[];
  value: string;
  onChange: (color: string) => void;
  allowCustom?: boolean;
}) {
  const normalized = value.toLowerCase();
  return (
    <div className="swatches">
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          className="swatch"
          style={{ background: color }}
          aria-pressed={color.toLowerCase() === normalized}
          aria-label={color}
          onClick={() => onChange(color)}
        />
      ))}
      {allowCustom && (
        <span className="swatch swatch--custom" title="custom">
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label="custom color" />
        </span>
      )}
    </div>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="toggle">
      <span>{label}</span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}
