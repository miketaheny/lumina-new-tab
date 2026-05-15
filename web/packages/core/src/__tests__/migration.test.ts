import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { storage } from '../storage';
import { migrateFromV1, hasV1Data } from '../migration';

// Minimal localStorage mock for node environment
const localStorageStore: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => localStorageStore[key] ?? null,
  setItem: (key: string, value: string) => { localStorageStore[key] = value; },
  removeItem: (key: string) => { delete localStorageStore[key]; },
  clear: () => { Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]); },
};
vi.stubGlobal('localStorage', localStorageMock);

beforeEach(async () => {
  await storage.clearAll();
  localStorageMock.clear();
});

describe('migration', () => {
  it('returns migrated: false when no v1 data', async () => {
    const result = await migrateFromV1();
    expect(result.migrated).toBe(false);
  });

  it('migrates settings from v1 state', async () => {
    localStorage.setItem('lumina_state', JSON.stringify({
      themes: ['aurora'], searchEngine: 'google', greetingName: 'Mike',
      links: [], notes: [], qlSections: [{ id: 'default', label: 'Links' }],
    }));
    const result = await migrateFromV1();
    expect(result.migrated).toBe(true);
    const settings = await storage.getSettings();
    expect(settings.themes).toEqual(['aurora']);
    expect(settings.searchEngine).toBe('google');
    expect(settings.greetingName).toBe('Mike');
  });

  it('migrates notes with correct structure', async () => {
    localStorage.setItem('lumina_state', JSON.stringify({
      notes: [
        { id: 'n1', title: 'Note 1', content: '# Hello' },
        { id: 'n2', title: 'Note 2', content: 'World' },
      ],
      links: [], qlSections: [],
    }));
    const result = await migrateFromV1();
    expect(result.notesCount).toBe(2);
    const notes = await storage.getNotes();
    expect(notes).toHaveLength(2);
    expect(notes[0].title).toBe('Note 1');
    expect(notes[0].sortOrder).toBe(0);
    expect(notes[1].sortOrder).toBe(1);
  });

  it('clears Asana keys after migration', async () => {
    localStorage.setItem('lumina_state', JSON.stringify({ links: [], notes: [], qlSections: [] }));
    localStorage.setItem('lumina_asana_pat', 'old-pat');
    localStorage.setItem('lumina_asana_workspace', '{"gid":"123"}');
    await migrateFromV1();
    expect(localStorage.getItem('lumina_asana_pat')).toBeNull();
    expect(localStorage.getItem('lumina_asana_workspace')).toBeNull();
  });

  it('hasV1Data detects localStorage state', () => {
    expect(hasV1Data()).toBe(false);
    localStorage.setItem('lumina_state', '{}');
    expect(hasV1Data()).toBe(true);
  });
});
