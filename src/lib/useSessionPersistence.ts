import { useEffect, useRef } from 'react';
import { loadSession, referencedImageIds, saveSession } from './persist';
import { useEditor } from '@/state/editorStore';
import { images } from '@/state/imageStore';

const SAVE_DEBOUNCE = 900;

/** Keeps the work-in-progress receipt in IndexedDB so a refresh (or a phone
 *  putting the tab to sleep) does not lose it. */
export function useSessionPersistence(onRestored: () => void): void {
  const restored = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const saved = await loadSession();
      restored.current = true;
      if (cancelled || !saved) return;
      try {
        await Promise.all(
          Object.entries(saved.images).map(([id, blob]) => images.add(blob, id)),
        );
        useEditor.getState().replaceScene(saved.scene);
        onRestored();
      } catch {
        /* a corrupt session is simply ignored */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let timer = 0;
    const unsubscribe = useEditor.subscribe((state, prev) => {
      if (state.scene === prev.scene || !restored.current) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const scene = useEditor.getState().scene;
        const blobs: Record<string, Blob> = {};
        for (const id of referencedImageIds(scene)) {
          const blob = images.getBlob(id);
          if (blob) blobs[id] = blob;
        }
        void saveSession(scene, blobs);
      }, SAVE_DEBOUNCE);
    });
    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, []);
}
