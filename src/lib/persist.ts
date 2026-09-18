import type { Scene } from '@/engine/types';

const DB_NAME = 'punch-receipt';
const STORE = 'session';
const KEY = 'current';
const VERSION = 1;

export type SavedSession = {
  scene: Scene;
  images: Record<string, Blob>;
  savedAt: number;
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const request = run(transaction.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => db.close();
      }),
  );
}

export function referencedImageIds(scene: Scene): string[] {
  const ids = new Set<string>();
  if (scene.photo.imageId) ids.add(scene.photo.imageId);
  if (scene.background.kind === 'image') ids.add(scene.background.imageId);
  for (const sticker of scene.stickers) {
    if (sticker.ref.kind === 'image') ids.add(sticker.ref.imageId);
  }
  for (const id of scene.customPunchIds ?? []) ids.add(id);
  if (scene.brush.customImageId) ids.add(scene.brush.customImageId);
  for (const stroke of scene.strokes) {
    if (stroke.customImageId) ids.add(stroke.customImageId);
  }
  return [...ids];
}

export async function saveSession(scene: Scene, images: Record<string, Blob>): Promise<void> {
  try {
    const payload: SavedSession = { scene, images, savedAt: Date.now() };
    await tx('readwrite', (store) => store.put(payload, KEY));
  } catch {
    // Private mode / quota errors must never break the editor.
  }
}

export async function loadSession(): Promise<SavedSession | null> {
  try {
    const saved = await tx<SavedSession | undefined>('readonly', (store) => store.get(KEY));
    return saved ?? null;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  try {
    await tx('readwrite', (store) => store.delete(KEY));
  } catch {
    /* ignore */
  }
}
