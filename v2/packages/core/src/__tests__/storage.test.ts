// v2/packages/core/src/__tests__/storage.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { storage } from '../storage';
import { DEFAULT_SETTINGS } from '../defaults';

beforeEach(async () => {
  await storage.clearAll();
});

describe('storage', () => {
  it('returns default settings when empty', async () => {
    const settings = await storage.getSettings();
    expect(settings.themes).toEqual(['cosmic']);
    expect(settings.searchEngine).toBe('claude');
  });

  it('round-trips settings', async () => {
    const modified = { ...DEFAULT_SETTINGS, greetingName: 'Mike', updatedAt: new Date().toISOString() };
    await storage.setSettings(modified);
    const result = await storage.getSettings();
    expect(result.greetingName).toBe('Mike');
  });

  it('returns empty array for notes when empty', async () => {
    const notes = await storage.getNotes();
    expect(notes).toEqual([]);
  });

  it('round-trips notes', async () => {
    const notes = [
      { id: 'n1', title: 'Test', content: '# Hello', sortOrder: 0, updatedAt: new Date().toISOString() },
    ];
    await storage.setNotes(notes);
    const result = await storage.getNotes();
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Test');
  });

  it('stores and retrieves wallpaper blobs', async () => {
    const blob = new Blob(['test-image-data'], { type: 'image/jpeg' });
    await storage.setWallpaperBlob('wp-1', blob);
    const result = await storage.getWallpaperBlob('wp-1');
    expect(result).toBeDefined();
    expect(result!.size).toBe(blob.size);
  });

  it('deletes wallpaper blobs', async () => {
    const blob = new Blob(['data'], { type: 'image/jpeg' });
    await storage.setWallpaperBlob('wp-1', blob);
    await storage.deleteWallpaperBlob('wp-1');
    const result = await storage.getWallpaperBlob('wp-1');
    expect(result).toBeUndefined();
  });
});
