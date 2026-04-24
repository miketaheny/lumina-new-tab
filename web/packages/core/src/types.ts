
// ─── Quick Links ────────────────────────────
export interface QuickLink {
  id: string;
  url: string;
  label: string;
  favicon: string | null;
  section: string;
  fromBookmark?: boolean;
  iconName?: string | null;
  faviconBg?: string;
}

export interface QuickLinkSection {
  id: string;
  label: string;
}

// ─── Notes ──────────────────────────────────
export interface Note {
  id: string;
  title: string;
  content: string;
  sortOrder: number;
  updatedAt: string; // ISO 8601
}

// ─── Kindling (Reading List) ────────────────
export interface KindlingTag {
  name: string;
  color: string;
}

export interface KindlingItem {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  tags: string[];
  readAt: string | null; // ISO 8601 or null for unread
  sortOrder: number;
  updatedAt: string;
}

export interface KindlingData {
  items: KindlingItem[];
  tags: KindlingTag[];
  updatedAt: string;
}

// ─── Code Snippets ─────────────────────────
export interface CodeSnippet {
  id: string;
  title: string;
  code: string;
  language: string;
  sortOrder: number;
  updatedAt: string;
}

export interface SnippetsData {
  snippets: CodeSnippet[];
  updatedAt: string;
}

// ─── Bookmarks ──────────────────────────────
export interface BookmarkNode {
  id: string;
  parentId: string | null;
  type: 'folder' | 'bookmark';
  title: string;
  url?: string; // only for type === 'bookmark'
  children?: BookmarkNode[];
  sortOrder: number;
}

export interface BookmarksData {
  roots: BookmarkNode[];
  updatedAt: string;
}

// ─── Wallpapers ─────────────────────────────
export interface WallpaperEntry {
  id: string;
  source: 'bing' | 'drive';
  driveFileId?: string;
  bingUrl?: string;
  label: string;
  emoji: string;
  isActive: boolean;
}

export interface WallpapersManifest {
  wallpapers: WallpaperEntry[];
  activeIds: string[];
  updatedAt: string;
}

// ─── Settings ───────────────────────────────
export interface LuminaSettings {
  themes: string[];
  intensity: 'subtle' | 'medium' | 'vivid';
  animateBg: boolean;
  showClock: boolean;
  showQuote: boolean;
  showGrain: boolean;
  searchEngine: string;
  focusText: string;
  postalCode: string;
  weatherUnit: 'f' | 'c';
  useGeoLocation: boolean;
  bgMode: 'colors' | 'wallpaper';
  focusLines: string[] | null;
  greetingName: string;
  greetingCustom: boolean;
  greetingCustomText: string;
  panelTheme: 'dark' | 'light' | 'system';
  panelWidth: number;
  notesPanelOpen: boolean;
  qlIconsOnly: boolean;
  qlCollapsed: Record<string, boolean>;
  activeNoteId: string | null;
  savedFaviconBg: 'white' | 'dark' | 'transparent';
  addressBook: AddressBookEntry[];
  updatedAt: string;
}

// ─── Quick Links data file ──────────────────
export interface QuickLinksData {
  links: QuickLink[];
  sections: QuickLinkSection[];
  updatedAt: string;
}

// ─── Address Book (auto-fill) ───────────────
export interface AddressBookEntry {
  id: string;
  label?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

// ─── Sync Metadata ──────────────────────────
export interface SyncTimestamps {
  settings?: string;
  quickLinks?: string;
  notes?: Record<string, string>; // noteId → modifiedTime
  kindling?: string;
  bookmarks?: string;
  wallpapers?: string;
}

export interface PendingChange {
  domain: SyncDomain;
  noteId?: string; // only for notes domain
  timestamp: string;
}

export type SyncDomain = 'settings' | 'quickLinks' | 'notes' | 'kindling' | 'bookmarks' | 'wallpapers';

export interface SyncMeta {
  timestamps: SyncTimestamps;
  pendingChanges: PendingChange[];
  lastFullSync: string | null;
}
