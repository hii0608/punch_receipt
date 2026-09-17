import { useState } from 'react';
import { Group, Segmented } from './Controls';
import { copyImage, downloadBlob, exportBlob, exportFilename, shareImage, type ExportRatio } from '@/engine/export';
import { useEditor } from '@/state/editorStore';
import { images } from '@/state/imageStore';
import { useT } from '@/i18n';

export function SharePanel({ onToast }: { onToast: (message: string) => void }) {
  const t = useT();
  const scene = useEditor((s) => s.scene);
  const [ratio, setRatio] = useState<ExportRatio>('receipt');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  const run = async (action: 'save' | 'share' | 'copy') => {
    setBusy(true);
    setStatus(t.share.preparing);
    try {
      const blob = await exportBlob(scene, images, ratio, 3);
      const filename = exportFilename(scene);
      if (action === 'copy') {
        const ok = await copyImage(blob);
        onToast(ok ? t.share.copied : t.share.failed);
      } else if (action === 'share') {
        const outcome = await shareImage(blob, filename, scene.text.title);
        if (outcome === 'downloaded') onToast(t.share.shareUnsupported);
        else if (outcome === 'shared') onToast(t.share.title);
      } else {
        downloadBlob(blob, filename);
        onToast(filename);
      }
      setStatus('');
    } catch {
      setStatus(t.share.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Group title={t.share.title}>
      <p className="hint">{t.share.ratio}</p>
      <Segmented<ExportRatio>
        value={ratio}
        onChange={setRatio}
        options={[
          { value: 'receipt', label: t.share.ratioReceipt },
          { value: 'story', label: t.share.ratioStory },
          { value: 'square', label: t.share.ratioSquare },
        ]}
      />
      <div style={{ height: 16 }} />
      <button type="button" className="btn" disabled={busy} onClick={() => void run('share')}>
        {t.share.share}
      </button>
      <div style={{ height: 9 }} />
      <div className="btn-row">
        <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => void run('save')}>
          {t.share.save}
        </button>
        <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => void run('copy')}>
          {t.share.copy}
        </button>
      </div>
      <p className="status">{status}</p>
    </Group>
  );
}
