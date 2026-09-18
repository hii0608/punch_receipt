import { useEffect, useRef, useState } from 'react';
import { useT } from '@/i18n';

const SIZE = 256;

export function StampDrawModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (blob: Blob) => void | Promise<void>;
}) {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, SIZE, SIZE);
    setDirty(false);
  }, [open]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * SIZE,
      y: ((e.clientY - rect.top) / rect.height) * SIZE,
    };
  };

  const paint = (e: React.PointerEvent<HTMLCanvasElement>, start: boolean) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const p = point(e);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 18;
    if (start) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    } else {
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    }
    setDirty(true);
  };

  if (!open) return null;

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal__card">
        <h2 className="group__title">{t.punch.drawTitle}</h2>
        <p className="hint">{t.punch.drawHint}</p>
        <canvas
          ref={canvasRef}
          className="stamp-draw"
          width={SIZE}
          height={SIZE}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            drawing.current = true;
            paint(e, true);
          }}
          onPointerMove={(e) => {
            if (!drawing.current) return;
            paint(e, false);
          }}
          onPointerUp={() => {
            drawing.current = false;
          }}
        />
        <div className="row">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            {t.action.cancel}
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              const ctx = canvasRef.current?.getContext('2d');
              ctx?.clearRect(0, 0, SIZE, SIZE);
              setDirty(false);
            }}
          >
            {t.punch.drawClear}
          </button>
          <button
            type="button"
            className="btn"
            disabled={!dirty}
            onClick={() => {
              canvasRef.current?.toBlob((blob) => {
                if (blob) void onSave(blob);
              }, 'image/png');
            }}
          >
            {t.punch.drawSave}
          </button>
        </div>
      </div>
    </div>
  );
}
