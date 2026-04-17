// v2/packages/core/src/defaults.ts
import type { LuminaSettings, QuickLinksData, KindlingData, BookmarksData, WallpapersManifest, SyncMeta } from './types';

export const DEFAULT_SETTINGS: LuminaSettings = {
  themes: ['cosmic'],
  intensity: 'medium',
  animateBg: true,
  showClock: true,
  showQuote: true,
  showGrain: true,
  searchEngine: 'claude',
  focusText: '',
  postalCode: '',
  weatherUnit: 'f',
  useGeoLocation: true,
  bgMode: 'colors',
  focusLines: null,
  greetingName: '',
  greetingCustom: false,
  greetingCustomText: '',
  panelTheme: 'dark',
  notesPanelOpen: true,
  qlIconsOnly: false,
  qlCollapsed: {},
  activeNoteId: null,
  savedFaviconBg: 'white',
  updatedAt: new Date().toISOString(),
};

export const DEFAULT_QUICK_LINKS: QuickLinksData = {
  links: [
    { id: 'ql-claude', url: 'https://claude.ai', label: 'Claude AI', favicon: null, section: 'default' },
    { id: 'ql-gmail', url: 'https://mail.google.com', label: 'Gmail', favicon: null, section: 'default' },
    { id: 'ql-gh', url: 'https://github.com', label: 'GitHub', favicon: null, section: 'default' },
    { id: 'ql-yt', url: 'https://youtube.com', label: 'YouTube', favicon: null, section: 'default' },
  ],
  sections: [{ id: 'default', label: 'Quick Links' }],
  updatedAt: new Date().toISOString(),
};

export const DEFAULT_KINDLING: KindlingData = {
  items: [],
  tags: [],
  updatedAt: new Date().toISOString(),
};

export const DEFAULT_BOOKMARKS: BookmarksData = {
  roots: [],
  updatedAt: new Date().toISOString(),
};

export const DEFAULT_WALLPAPERS: WallpapersManifest = {
  wallpapers: [
    { id: 'wp-bing', source: 'bing', label: 'Bing Daily', emoji: '🌅', isActive: false },
  ],
  activeIds: [],
  updatedAt: new Date().toISOString(),
};

export const DEFAULT_SYNC_META: SyncMeta = {
  timestamps: {},
  pendingChanges: [],
  lastFullSync: null,
};
