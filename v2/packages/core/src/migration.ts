import { storage } from './storage';
import type { LuminaSettings, QuickLinksData, Note, KindlingData } from './types';
import { DEFAULT_SETTINGS, DEFAULT_KINDLING } from './defaults';

export interface MigrationResult {
  migrated: boolean;
  notesCount: number;
  linksCount: number;
  kindlingCount: number;
}

export async function migrateFromV1(): Promise<MigrationResult> {
  const raw = localStorage.getItem('lumina_state');
  if (!raw) return { migrated: false, notesCount: 0, linksCount: 0, kindlingCount: 0 };

  const v1State = JSON.parse(raw);
  const now = new Date().toISOString();

  // Settings
  const settings: LuminaSettings = { ...DEFAULT_SETTINGS };
  const settingsKeys: (keyof LuminaSettings)[] = [
    'themes', 'intensity', 'animateBg', 'showClock', 'showQuote', 'showGrain',
    'searchEngine', 'focusText', 'postalCode', 'weatherUnit', 'useGeoLocation',
    'bgMode', 'focusLines', 'greetingName', 'greetingCustom', 'greetingCustomText',
    'panelTheme', 'notesPanelOpen', 'qlIconsOnly', 'qlCollapsed', 'activeNoteId',
    'savedFaviconBg',
  ];
  for (const key of settingsKeys) {
    if (v1State[key] !== undefined) (settings as any)[key] = v1State[key];
  }
  settings.updatedAt = now;
  await storage.setSettings(settings);

  // Quick Links
  const links = (v1State.links || []).map((l: any) => ({
    id: l.id,
    url: l.url,
    label: l.label,
    favicon: l.favicon,
    section: l.section || 'default',
    fromBookmark: l.fromBookmark || false,
    iconName: l.iconName || null,
    faviconBg: l.faviconBg || undefined,
  }));
  const sections = v1State.qlSections || [{ id: 'default', label: 'Quick Links' }];
  const qlData: QuickLinksData = { links, sections, updatedAt: now };
  await storage.setQuickLinks(qlData);

  // Notes
  const notes: Note[] = (v1State.notes || []).map((n: any, i: number) => ({
    id: n.id || `note-${Date.now()}-${i}`,
    title: n.title || 'Untitled',
    content: n.content || '',
    sortOrder: i,
    updatedAt: now,
  }));
  await storage.setNotes(notes);

  // Kindling
  let kindlingData: KindlingData = { ...DEFAULT_KINDLING };
  const savedRaw = localStorage.getItem('lumina_saved');
  if (savedRaw) {
    const saved = JSON.parse(savedRaw);
    kindlingData = {
      items: (saved.links || []).map((l: any, i: number) => ({
        id: l.id || `kl-${Date.now()}-${i}`,
        url: l.url,
        title: l.title,
        favicon: l.favicon,
        tags: l.tags || [],
        readAt: l.readAt || null,
        sortOrder: i,
        updatedAt: now,
      })),
      tags: (saved.tags || []).map((t: any) => ({ name: t.name, color: t.color })),
      updatedAt: now,
    };
  }
  await storage.setKindling(kindlingData);

  // Clear Asana sync keys
  localStorage.removeItem('lumina_asana_pat');
  localStorage.removeItem('lumina_asana_workspace');
  localStorage.removeItem('lumina_asana_project');
  localStorage.removeItem('lumina_asana_modified');

  return {
    migrated: true,
    notesCount: notes.length,
    linksCount: links.length,
    kindlingCount: kindlingData.items.length,
  };
}

export function hasV1Data(): boolean {
  return localStorage.getItem('lumina_state') !== null;
}
