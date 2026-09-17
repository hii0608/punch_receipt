import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackgroundPanel } from './components/BackgroundPanel';
import { PunchPanel } from './components/PunchPanel';
import { ReceiptCanvas, type CanvasMode } from './components/ReceiptCanvas';
import { ReceiptPanel } from './components/ReceiptPanel';
import { SharePanel } from './components/SharePanel';
import { StickerPanel } from './components/StickerPanel';
import { pickFile } from './lib/pickFile';
import { clearSession } from './lib/persist';
import { useSessionPersistence } from './lib/useSessionPersistence';
import { detectLocale, LocaleContext, useT } from './i18n';
import type { Locale } from './engine/types';
import { useEditor } from './state/editorStore';
import { images } from './state/imageStore';

type TabId = 'punch' | 'background' | 'receipt' | 'sticker' | 'share';

const MODE_BY_TAB: Record<TabId, CanvasMode> = {
  punch: 'punch',
  background: 'view',
  receipt: 'view',
  sticker: 'sticker',
  share: 'view',
};

function Workspace({ locale, onLocale }: { locale: Locale; onLocale: (locale: Locale) => void }) {
  const t = useT();
  const [tab, setTab] = useState<TabId>('punch');
  const [sheetOpen, setSheetOpen] = useState(true);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<number>();

  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const reset = useEditor((s) => s.reset);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const setPhoto = useEditor((s) => s.setPhoto);
  const selectSticker = useEditor((s) => s.selectSticker);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 2600);
  }, []);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  useSessionPersistence(useCallback(() => showToast(t.restored), [showToast, t]));

  const startOver = useCallback(() => {
    reset();
    void clearSession();
  }, [reset]);

  const requestPhoto = useCallback(async () => {
    const file = await pickFile();
    if (!file) return;
    setPhoto(await images.add(file));
  }, [setPhoto]);

  const tabs = useMemo(
    () =>
      [
        { id: 'punch' as const, label: t.tab.punch },
        { id: 'background' as const, label: t.tab.background },
        { id: 'receipt' as const, label: t.tab.receipt },
        { id: 'sticker' as const, label: t.tab.sticker },
        { id: 'share' as const, label: t.tab.share },
      ],
    [t],
  );

  return (
    <div className="app">
      <div className="app__main">
        <header className="topbar">
          <span className="topbar__brand">
            <span className="topbar__dot" aria-hidden />
            {t.appName}
          </span>
          <button
            type="button"
            className="iconbtn"
            onClick={undo}
            disabled={!canUndo}
            aria-label={t.action.undo}
            title={t.action.undo}
          >
            ↶
          </button>
          <button
            type="button"
            className="iconbtn"
            onClick={redo}
            disabled={!canRedo}
            aria-label={t.action.redo}
            title={t.action.redo}
          >
            ↷
          </button>
          <button
            type="button"
            className="iconbtn iconbtn--ghost"
            onClick={startOver}
            aria-label={t.action.reset}
            title={t.action.reset}
          >
            ⟲
          </button>
          <div className="langtoggle" role="group" aria-label={t.language}>
            <button type="button" aria-pressed={locale === 'ko'} onClick={() => onLocale('ko')}>
              KO
            </button>
            <button type="button" aria-pressed={locale === 'en'} onClick={() => onLocale('en')}>
              EN
            </button>
          </div>
        </header>

        <main className="stage">
          <ReceiptCanvas mode={MODE_BY_TAB[tab]} onRequestPhoto={() => void requestPhoto()} />
        </main>
      </div>

      <section className={sheetOpen ? 'sheet' : 'sheet sheet--collapsed'}>
        <button
          type="button"
          className="sheet__grip"
          aria-expanded={sheetOpen}
          aria-label={sheetOpen ? t.action.collapse : t.action.expand}
          onClick={() => setSheetOpen((open) => !open)}
        />
        <div className="tabs" role="tablist">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              className="tab"
              aria-selected={tab === item.id}
              onClick={() => {
                setTab(item.id);
                setSheetOpen(true);
                if (item.id !== 'sticker') selectSticker(null);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="panel" role="tabpanel">
          {tab === 'punch' && <PunchPanel />}
          {tab === 'background' && <BackgroundPanel />}
          {tab === 'receipt' && <ReceiptPanel />}
          {tab === 'sticker' && <StickerPanel />}
          {tab === 'share' && <SharePanel onToast={showToast} />}
        </div>
      </section>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

export default function App() {
  const sceneLocale = useEditor((s) => s.scene.locale);
  const setLocale = useEditor((s) => s.setLocale);

  useEffect(() => {
    setLocale(detectLocale());
    // Only on first mount: afterwards the user's choice wins.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.lang = sceneLocale;
  }, [sceneLocale]);

  return (
    <LocaleContext.Provider value={sceneLocale}>
      <Workspace locale={sceneLocale} onLocale={setLocale} />
    </LocaleContext.Provider>
  );
}
