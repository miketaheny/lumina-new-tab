import { openDB, type IDBPDatabase } from 'idb';
import type {
  LuminaSettings, QuickLinksData, Note, KindlingData,
  BookmarksData, WallpapersManifest, SyncMeta, SnippetsData,
} from './types';
import {
  DEFAULT_SETTINGS, DEFAULT_QUICK_LINKS, DEFAULT_KINDLING,
  DEFAULT_BOOKMARKS, DEFAULT_WALLPAPERS, DEFAULT_SYNC_META, DEFAULT_SNIPPETS,
} from './defaults';

const DB_NAME = 'lumina-cache';
const DB_VERSION = 1;

interface LuminaDB {
  settings: LuminaSettings;
  quickLinks: QuickLinksData;
  notes: Note[];
  kindling: KindlingData;
  bookmarks: BookmarksData;
  wallpapers: WallpapersManifest;
  wallpaperBlobs: { id: string; blob: Blob };
  syncMeta: SyncMeta;
}

type StoreName = keyof LuminaDB;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('keyval')) {
          db.createObjectStore('keyval');
        }
        if (!db.objectStoreNames.contains('wallpaperBlobs')) {
          db.createObjectStore('wallpaperBlobs', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

async function getVal<T>(key: string): Promise<T | undefined> {
  const db = await getDb();
  return db.get('keyval', key);
}

async function setVal<T>(key: string, val: T): Promise<void> {
  const db = await getDb();
  await db.put('keyval', val, key);
}

export const storage = {
  async getSettings(): Promise<LuminaSettings> {
    const stored = await getVal<Partial<LuminaSettings>>('settings');
    return stored ? { ...DEFAULT_SETTINGS, ...stored } : { ...DEFAULT_SETTINGS };
  },
  async setSettings(data: LuminaSettings): Promise<void> {
    await setVal('settings', data);
  },

  async getQuickLinks(): Promise<QuickLinksData> {
    return (await getVal<QuickLinksData>('quickLinks')) ?? { ...DEFAULT_QUICK_LINKS };
  },
  async setQuickLinks(data: QuickLinksData): Promise<void> {
    await setVal('quickLinks', data);
  },

  async getNotes(): Promise<Note[]> {
    return (await getVal<Note[]>('notes')) ?? [];
  },
  async setNotes(data: Note[]): Promise<void> {
    await setVal('notes', data);
  },

  async getKindling(): Promise<KindlingData> {
    return (await getVal<KindlingData>('kindling')) ?? { ...DEFAULT_KINDLING };
  },
  async setKindling(data: KindlingData): Promise<void> {
    await setVal('kindling', data);
  },

  async getBookmarks(): Promise<BookmarksData> {
    return (await getVal<BookmarksData>('bookmarks')) ?? { ...DEFAULT_BOOKMARKS };
  },
  async setBookmarks(data: BookmarksData): Promise<void> {
    await setVal('bookmarks', data);
  },

  async getSnippets(): Promise<SnippetsData> {
    return (await getVal<SnippetsData>('snippets')) ?? { ...DEFAULT_SNIPPETS, snippets: [] };
  },
  async setSnippets(data: SnippetsData): Promise<void> {
    await setVal('snippets', data);
  },

  async getWallpapers(): Promise<WallpapersManifest> {
    const stored = await getVal<WallpapersManifest>('wallpapers');
    if (!stored) return { ...DEFAULT_WALLPAPERS };
    return {
      ...stored,
      wallpapers: stored.wallpapers.map(wp => {
        const fallback = DEFAULT_WALLPAPERS.wallpapers.find(defaultWp => defaultWp.id === wp.id);
        return fallback ? { ...fallback, ...wp, bingUrl: wp.bingUrl ?? fallback.bingUrl } : wp;
      }),
    };
  },
  async setWallpapers(data: WallpapersManifest): Promise<void> {
    await setVal('wallpapers', data);
  },

  async getWallpaperBlob(id: string): Promise<Blob | undefined> {
    const db = await getDb();
    const row = await db.get('wallpaperBlobs', id);
    return row?.blob;
  },
  async setWallpaperBlob(id: string, blob: Blob): Promise<void> {
    const db = await getDb();
    await db.put('wallpaperBlobs', { id, blob });
  },
  async deleteWallpaperBlob(id: string): Promise<void> {
    const db = await getDb();
    await db.delete('wallpaperBlobs', id);
  },

  async getSyncMeta(): Promise<SyncMeta> {
    return (await getVal<SyncMeta>('syncMeta')) ?? structuredClone(DEFAULT_SYNC_META);
  },
  async setSyncMeta(data: SyncMeta): Promise<void> {
    await setVal('syncMeta', data);
  },

  async clearAll(): Promise<void> {
    const db = await getDb();
    await db.clear('keyval');
    await db.clear('wallpaperBlobs');
  },
};
