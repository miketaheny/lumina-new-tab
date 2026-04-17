# Lumina v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite Lumina New Tab into a Turborepo monorepo producing a Chrome MV3 extension (WXT) and a standalone web companion (Next.js static export on Cloudflare Pages), with Google Drive as a client-side-only sync backend.

**Architecture:** Turborepo with `apps/web` (Next.js 15), `apps/extension` (WXT + React), and three shared packages: `packages/core` (data types, IndexedDB, sync engine), `packages/drive` (Google Drive API client + auth), `packages/ui` (shared React components). All storage is local-first via IndexedDB with background sync to Google Drive.

**Tech Stack:** TypeScript, React 19, Next.js 15, WXT, Turborepo, TipTap, Google Identity Services, Google Drive API, IndexedDB (idb), Vitest, React Testing Library, Playwright, Tailwind CSS 4

**Spec:** `docs/superpowers/specs/2026-04-16-lumina-v2-companion-rewrite-design.md`

**Existing code reference:** The current vanilla JS extension lives at the repo root. Key files: `newtab.js` (~4037 lines — all app logic), `newtab.html` (~4290 lines — HTML + CSS), `background.js` (184 lines — context menu + autofill), `popup.js`/`popup.html`, and three content scripts (`gemini.js`, `claude-ai.js`, `chatgpt.js`).

---

## Phase 1: Monorepo Scaffold

Set up the Turborepo workspace structure with all packages and apps. Nothing functional yet — just build tooling, TypeScript config, and empty entry points that compile.

### Task 1: Initialize Turborepo root

**Files:**
- Create: `v2/package.json`
- Create: `v2/turbo.json`
- Create: `v2/tsconfig.json`
- Create: `v2/.gitignore`

The v2 directory lives alongside the existing extension code during development. It becomes the repo root when the rewrite is complete.

- [ ] **Step 1: Create the v2 directory and root package.json**

```bash
mkdir -p v2
```

```json
// v2/package.json
{
  "name": "lumina",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "test": "turbo test",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck"
  },
  "devDependencies": {
    "turbo": "^2.5.0",
    "typescript": "^5.8.0"
  }
}
```

- [ ] **Step 2: Create turbo.json**

```json
// v2/turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", ".output/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "lint": {}
  }
}
```

- [ ] **Step 3: Create root tsconfig.json**

```json
// v2/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 4: Create .gitignore**

```
node_modules/
dist/
.next/
.output/
.turbo/
*.tsbuildinfo
```

- [ ] **Step 5: Install dependencies and verify**

```bash
cd v2 && npm install
npx turbo --version
```

Expected: Turbo version prints, no errors.

- [ ] **Step 6: Commit**

```bash
git add v2/package.json v2/turbo.json v2/tsconfig.json v2/.gitignore v2/package-lock.json
git commit -m "feat: initialize Turborepo monorepo scaffold for v2"
```

---

### Task 2: Create packages/core scaffold

**Files:**
- Create: `v2/packages/core/package.json`
- Create: `v2/packages/core/tsconfig.json`
- Create: `v2/packages/core/src/index.ts`

- [ ] **Step 1: Create package.json**

```json
// v2/packages/core/package.json
{
  "name": "@lumina/core",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vitest": "^3.1.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
// v2/packages/core/tsconfig.json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create empty entry point**

```typescript
// v2/packages/core/src/index.ts
export {};
```

- [ ] **Step 4: Install and verify typecheck**

```bash
cd v2 && npm install
npx turbo typecheck --filter=@lumina/core
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add v2/packages/core/
git commit -m "feat: add packages/core scaffold"
```

---

### Task 3: Create packages/drive scaffold

**Files:**
- Create: `v2/packages/drive/package.json`
- Create: `v2/packages/drive/tsconfig.json`
- Create: `v2/packages/drive/src/index.ts`

- [ ] **Step 1: Create package.json**

```json
// v2/packages/drive/package.json
{
  "name": "@lumina/drive",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@lumina/core": "*"
  },
  "devDependencies": {
    "vitest": "^3.1.0",
    "fake-indexeddb": "^6.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
// v2/packages/drive/tsconfig.json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create empty entry point**

```typescript
// v2/packages/drive/src/index.ts
export {};
```

- [ ] **Step 4: Verify**

```bash
cd v2 && npm install
npx turbo typecheck --filter=@lumina/drive
```

- [ ] **Step 5: Commit**

```bash
git add v2/packages/drive/
git commit -m "feat: add packages/drive scaffold"
```

---

### Task 4: Create packages/ui scaffold

**Files:**
- Create: `v2/packages/ui/package.json`
- Create: `v2/packages/ui/tsconfig.json`
- Create: `v2/packages/ui/src/index.ts`

- [ ] **Step 1: Create package.json**

```json
// v2/packages/ui/package.json
{
  "name": "@lumina/ui",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@lumina/core": "*",
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  },
  "devDependencies": {
    "@testing-library/react": "^16.3.0",
    "@testing-library/jest-dom": "^6.6.0",
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "vitest": "^3.1.0",
    "jsdom": "^26.1.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
// v2/packages/ui/tsconfig.json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "jsx": "react-jsx"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create empty entry point**

```typescript
// v2/packages/ui/src/index.ts
export {};
```

- [ ] **Step 4: Verify**

```bash
cd v2 && npm install
npx turbo typecheck --filter=@lumina/ui
```

- [ ] **Step 5: Commit**

```bash
git add v2/packages/ui/
git commit -m "feat: add packages/ui scaffold"
```

---

### Task 5: Create apps/web scaffold (Next.js 15)

**Files:**
- Create: `v2/apps/web/package.json`
- Create: `v2/apps/web/tsconfig.json`
- Create: `v2/apps/web/next.config.ts`
- Create: `v2/apps/web/app/layout.tsx`
- Create: `v2/apps/web/app/page.tsx`

- [ ] **Step 1: Create package.json**

```json
// v2/apps/web/package.json
{
  "name": "@lumina/web",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3100",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@lumina/core": "*",
    "@lumina/drive": "*",
    "@lumina/ui": "*",
    "next": "^15.3.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  },
  "devDependencies": {
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0"
  }
}
```

- [ ] **Step 2: Create next.config.ts**

```typescript
// v2/apps/web/next.config.ts
import type { NextConfig } from 'next';

const config: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  transpilePackages: ['@lumina/core', '@lumina/drive', '@lumina/ui'],
};

export default config;
```

- [ ] **Step 3: Create tsconfig.json**

```json
// v2/apps/web/tsconfig.json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "plugins": [{ "name": "next" }],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "incremental": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create app shell**

```tsx
// v2/apps/web/app/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Lumina',
  description: 'Your personal new tab companion',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

```tsx
// v2/apps/web/app/page.tsx
export default function Home() {
  return <div>Lumina v2</div>;
}
```

- [ ] **Step 5: Install and verify dev server starts**

```bash
cd v2 && npm install
npx turbo dev --filter=@lumina/web
```

Expected: Next.js dev server starts on port 3100. Visit http://localhost:3100 — shows "Lumina v2".

- [ ] **Step 6: Commit**

```bash
git add v2/apps/web/
git commit -m "feat: add apps/web scaffold (Next.js 15)"
```

---

### Task 6: Create apps/extension scaffold (WXT)

**Files:**
- Create: `v2/apps/extension/package.json`
- Create: `v2/apps/extension/tsconfig.json`
- Create: `v2/apps/extension/wxt.config.ts`
- Create: `v2/apps/extension/entrypoints/newtab/index.html`
- Create: `v2/apps/extension/entrypoints/newtab/main.tsx`
- Create: `v2/apps/extension/entrypoints/popup/index.html`
- Create: `v2/apps/extension/entrypoints/popup/main.tsx`
- Create: `v2/apps/extension/entrypoints/background.ts`

- [ ] **Step 1: Create package.json**

```json
// v2/apps/extension/package.json
{
  "name": "@lumina/extension",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "wxt",
    "build": "wxt build",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@lumina/core": "*",
    "@lumina/drive": "*",
    "@lumina/ui": "*",
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  },
  "devDependencies": {
    "@types/chrome": "^0.0.300",
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "wxt": "^0.20.0"
  }
}
```

- [ ] **Step 2: Create wxt.config.ts**

```typescript
// v2/apps/extension/wxt.config.ts
import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Lumina — New Tab Page',
    description: 'A gorgeous new tab with AI search, quick links, notes, reading list, weather, and animated backgrounds.',
    permissions: ['storage', 'bookmarks', 'activeTab', 'contextMenus', 'scripting', 'identity'],
    host_permissions: [
      '<all_urls>',
      'https://bible-api.com/*',
      'https://geocoding-api.open-meteo.com/*',
      'https://api.open-meteo.com/*',
      'https://www.bing.com/*',
    ],
    oauth2: {
      client_id: 'PLACEHOLDER.apps.googleusercontent.com',
      scopes: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
    },
  },
});
```

- [ ] **Step 3: Create tsconfig.json**

```json
// v2/apps/extension/tsconfig.json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules", ".output", ".wxt"]
}
```

- [ ] **Step 4: Create newtab entry point**

```html
<!-- v2/apps/extension/entrypoints/newtab/index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Lumina</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./main.tsx"></script>
</body>
</html>
```

```tsx
// v2/apps/extension/entrypoints/newtab/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';

function NewTab() {
  return <div>Lumina v2 — Extension</div>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<NewTab />);
```

- [ ] **Step 5: Create popup entry point**

```html
<!-- v2/apps/extension/entrypoints/popup/index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Lumina</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./main.tsx"></script>
</body>
</html>
```

```tsx
// v2/apps/extension/entrypoints/popup/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';

function Popup() {
  return <div style={{ width: 300, padding: 16 }}>Lumina — open a new tab to get started.</div>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Popup />);
```

- [ ] **Step 6: Create background service worker stub**

```typescript
// v2/apps/extension/entrypoints/background.ts
export default defineBackground(() => {
  console.log('Lumina background service worker started');
});
```

- [ ] **Step 7: Install and verify WXT dev starts**

```bash
cd v2 && npm install
cd v2/apps/extension && npx wxt
```

Expected: WXT starts dev mode, opens Chrome with the extension loaded. New tab shows "Lumina v2 — Extension".

- [ ] **Step 8: Commit**

```bash
git add v2/apps/extension/
git commit -m "feat: add apps/extension scaffold (WXT)"
```

---

### Task 7: Verify full monorepo build

- [ ] **Step 1: Run turbo build from root**

```bash
cd v2 && npx turbo build
```

Expected: All packages and apps build successfully.

- [ ] **Step 2: Run turbo typecheck from root**

```bash
cd v2 && npx turbo typecheck
```

Expected: All packages typecheck successfully.

- [ ] **Step 3: Commit any fixes needed**

---

## Phase 2: Data Types & IndexedDB Layer

Define all TypeScript types for the data domains and build the IndexedDB storage layer. This is the foundation everything else depends on.

### Task 8: Define data types

**Files:**
- Create: `v2/packages/core/src/types.ts`
- Modify: `v2/packages/core/src/index.ts`

Port the data shapes from the existing `newtab.js` `DEFAULT_STATE`, `savedData`, bookmark structures, and note objects into TypeScript interfaces.

- [ ] **Step 1: Create types.ts**

```typescript
// v2/packages/core/src/types.ts

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
  panelTheme: 'dark' | 'light';
  notesPanelOpen: boolean;
  qlIconsOnly: boolean;
  qlCollapsed: Record<string, boolean>;
  activeNoteId: string | null;
  savedFaviconBg: 'white' | 'dark' | 'transparent';
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
```

- [ ] **Step 2: Export from index.ts**

```typescript
// v2/packages/core/src/index.ts
export * from './types';
```

- [ ] **Step 3: Verify typecheck**

```bash
cd v2 && npx turbo typecheck --filter=@lumina/core
```

- [ ] **Step 4: Commit**

```bash
git add v2/packages/core/src/
git commit -m "feat: define all data types for Lumina v2 domains"
```

---

### Task 9: Build IndexedDB storage layer

**Files:**
- Create: `v2/packages/core/src/storage.ts`
- Create: `v2/packages/core/src/defaults.ts`
- Test: `v2/packages/core/src/__tests__/storage.test.ts`

Uses the `idb` library for a typed IndexedDB wrapper.

- [ ] **Step 1: Add idb dependency**

```bash
cd v2/packages/core && npm install idb
```

- [ ] **Step 2: Create defaults.ts with default values**

```typescript
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
```

- [ ] **Step 3: Create storage.ts — the IndexedDB layer**

```typescript
// v2/packages/core/src/storage.ts
import { openDB, type IDBPDatabase } from 'idb';
import type {
  LuminaSettings, QuickLinksData, Note, KindlingData,
  BookmarksData, WallpapersManifest, SyncMeta,
} from './types';
import {
  DEFAULT_SETTINGS, DEFAULT_QUICK_LINKS, DEFAULT_KINDLING,
  DEFAULT_BOOKMARKS, DEFAULT_WALLPAPERS, DEFAULT_SYNC_META,
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
    return (await getVal<LuminaSettings>('settings')) ?? { ...DEFAULT_SETTINGS };
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

  async getWallpapers(): Promise<WallpapersManifest> {
    return (await getVal<WallpapersManifest>('wallpapers')) ?? { ...DEFAULT_WALLPAPERS };
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
    return (await getVal<SyncMeta>('syncMeta')) ?? { ...DEFAULT_SYNC_META };
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
```

- [ ] **Step 4: Write tests**

```typescript
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
```

- [ ] **Step 5: Add fake-indexeddb dev dependency**

```bash
cd v2/packages/core && npm install -D fake-indexeddb
```

- [ ] **Step 6: Create vitest config**

```typescript
// v2/packages/core/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});
```

- [ ] **Step 7: Run tests**

```bash
cd v2 && npx turbo test --filter=@lumina/core
```

Expected: All 6 tests pass.

- [ ] **Step 8: Update exports**

```typescript
// v2/packages/core/src/index.ts
export * from './types';
export * from './defaults';
export { storage } from './storage';
```

- [ ] **Step 9: Commit**

```bash
git add v2/packages/core/
git commit -m "feat: add IndexedDB storage layer with typed accessors"
```

---

### Task 10: Note frontmatter serialization

**Files:**
- Create: `v2/packages/core/src/note-format.ts`
- Test: `v2/packages/core/src/__tests__/note-format.test.ts`

Notes are stored as individual `.md` files with YAML frontmatter in Google Drive. This module converts between `Note` objects and markdown strings.

- [ ] **Step 1: Write failing test**

```typescript
// v2/packages/core/src/__tests__/note-format.test.ts
import { describe, it, expect } from 'vitest';
import { noteToMarkdown, markdownToNote } from '../note-format';
import type { Note } from '../types';

describe('noteToMarkdown', () => {
  it('serializes a note to markdown with frontmatter', () => {
    const note: Note = {
      id: 'note-abc123',
      title: 'Shopping List',
      sortOrder: 2,
      updatedAt: '2026-04-16T10:30:00Z',
      content: '- Eggs\n- Milk',
    };
    const md = noteToMarkdown(note);
    expect(md).toContain('---');
    expect(md).toContain('id: note-abc123');
    expect(md).toContain('title: Shopping List');
    expect(md).toContain('sort_order: 2');
    expect(md).toContain('updated_at: 2026-04-16T10:30:00Z');
    expect(md).toContain('- Eggs\n- Milk');
  });

  it('escapes titles with colons', () => {
    const note: Note = {
      id: 'n1', title: 'Note: important', sortOrder: 0,
      updatedAt: '2026-01-01T00:00:00Z', content: 'body',
    };
    const md = noteToMarkdown(note);
    expect(md).toContain('title: "Note: important"');
  });
});

describe('markdownToNote', () => {
  it('parses markdown with frontmatter into a Note', () => {
    const md = `---
id: note-abc123
title: Shopping List
sort_order: 2
updated_at: 2026-04-16T10:30:00Z
---
- Eggs
- Milk`;
    const note = markdownToNote(md);
    expect(note.id).toBe('note-abc123');
    expect(note.title).toBe('Shopping List');
    expect(note.sortOrder).toBe(2);
    expect(note.updatedAt).toBe('2026-04-16T10:30:00Z');
    expect(note.content).toBe('- Eggs\n- Milk');
  });

  it('handles empty content', () => {
    const md = `---
id: n1
title: Empty
sort_order: 0
updated_at: 2026-01-01T00:00:00Z
---`;
    const note = markdownToNote(md);
    expect(note.content).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd v2 && npx turbo test --filter=@lumina/core
```

Expected: FAIL — `noteToMarkdown` and `markdownToNote` are not defined.

- [ ] **Step 3: Implement note-format.ts**

```typescript
// v2/packages/core/src/note-format.ts
import type { Note } from './types';

function yamlValue(val: string): string {
  if (/[:#{}[\],&*?|>!%@`]/.test(val) || val.startsWith('"') || val.startsWith("'")) {
    return `"${val.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return val;
}

export function noteToMarkdown(note: Note): string {
  const lines = [
    '---',
    `id: ${yamlValue(note.id)}`,
    `title: ${yamlValue(note.title)}`,
    `sort_order: ${note.sortOrder}`,
    `updated_at: ${note.updatedAt}`,
    '---',
  ];
  if (note.content) {
    lines.push(note.content);
  }
  return lines.join('\n');
}

export function markdownToNote(md: string): Note {
  const fmMatch = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!fmMatch) {
    throw new Error('Invalid note: missing frontmatter');
  }
  const frontmatter = fmMatch[1];
  const content = fmMatch[2].trim();

  const get = (key: string): string => {
    const re = new RegExp(`^${key}:\\s*(.+)$`, 'm');
    const m = frontmatter.match(re);
    if (!m) return '';
    let val = m[1].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    return val;
  };

  return {
    id: get('id'),
    title: get('title'),
    sortOrder: parseInt(get('sort_order') || '0', 10),
    updatedAt: get('updated_at'),
    content,
  };
}
```

- [ ] **Step 4: Run tests**

```bash
cd v2 && npx turbo test --filter=@lumina/core
```

Expected: All tests pass.

- [ ] **Step 5: Export and commit**

Add to `v2/packages/core/src/index.ts`:
```typescript
export { noteToMarkdown, markdownToNote } from './note-format';
```

```bash
git add v2/packages/core/src/
git commit -m "feat: add note frontmatter serialization (markdown ↔ Note)"
```

---

## Phase 3: Google Drive Client

Build the `@lumina/drive` package — handles Google Drive API calls (list, read, write, delete files in the `Lumina/` folder) and the two auth flows (GIS for web, `chrome.identity` for extension).

### Task 11: Auth module

**Files:**
- Create: `v2/packages/drive/src/auth.ts`
- Test: `v2/packages/drive/src/__tests__/auth.test.ts`

- [ ] **Step 1: Create auth.ts**

The auth module exposes a platform-agnostic interface. The web and extension apps each provide a platform-specific `AuthProvider` at initialization.

```typescript
// v2/packages/drive/src/auth.ts
export interface UserProfile {
  email: string;
  name: string;
  picture?: string;
}

export interface AuthProvider {
  getAccessToken(): Promise<string | null>;
  signIn(): Promise<string>;
  signOut(): Promise<void>;
  getProfile(): Promise<UserProfile | null>;
}

let provider: AuthProvider | null = null;

export function setAuthProvider(p: AuthProvider) {
  provider = p;
}

export function getAuthProvider(): AuthProvider {
  if (!provider) throw new Error('Auth provider not initialized. Call setAuthProvider() first.');
  return provider;
}

export async function getAccessToken(): Promise<string | null> {
  return getAuthProvider().getAccessToken();
}

export async function isSignedIn(): Promise<boolean> {
  const token = await getAccessToken();
  return token !== null;
}
```

- [ ] **Step 2: Write test**

```typescript
// v2/packages/drive/src/__tests__/auth.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { setAuthProvider, getAccessToken, isSignedIn, getAuthProvider } from '../auth';
import type { AuthProvider } from '../auth';

const mockProvider: AuthProvider = {
  getAccessToken: async () => 'mock-token-123',
  signIn: async () => 'mock-token-123',
  signOut: async () => {},
  getProfile: async () => ({ email: 'test@example.com', name: 'Test User' }),
};

beforeEach(() => {
  setAuthProvider(mockProvider);
});

describe('auth', () => {
  it('returns token from provider', async () => {
    const token = await getAccessToken();
    expect(token).toBe('mock-token-123');
  });

  it('reports signed in when token exists', async () => {
    expect(await isSignedIn()).toBe(true);
  });

  it('reports signed out when token is null', async () => {
    setAuthProvider({ ...mockProvider, getAccessToken: async () => null });
    expect(await isSignedIn()).toBe(false);
  });

  it('throws when no provider set', () => {
    setAuthProvider(null as any);
    expect(() => getAuthProvider()).toThrow('Auth provider not initialized');
  });
});
```

- [ ] **Step 3: Add vitest config for drive package**

```typescript
// v2/packages/drive/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});
```

- [ ] **Step 4: Run tests**

```bash
cd v2 && npx turbo test --filter=@lumina/drive
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add v2/packages/drive/
git commit -m "feat: add platform-agnostic auth module with provider interface"
```

---

### Task 12: Google Drive API client

**Files:**
- Create: `v2/packages/drive/src/drive-client.ts`
- Test: `v2/packages/drive/src/__tests__/drive-client.test.ts`

- [ ] **Step 1: Create drive-client.ts**

```typescript
// v2/packages/drive/src/drive-client.ts
import { getAccessToken } from './auth';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const LUMINA_FOLDER = 'Lumina';

async function driveHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not signed in');
  return { Authorization: `Bearer ${token}` };
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  parents?: string[];
}

export async function findOrCreateFolder(name: string, parentId?: string): Promise<string> {
  const headers = await driveHeaders();
  let q = `name='${name}' and mimeType='${FOLDER_MIME}' and trashed=false`;
  if (parentId) q += ` and '${parentId}' in parents`;

  const searchResp = await fetch(
    `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`,
    { headers },
  );
  const searchData = await searchResp.json();
  if (searchData.files?.length) return searchData.files[0].id;

  const body: Record<string, unknown> = { name, mimeType: FOLDER_MIME };
  if (parentId) body.parents = [parentId];
  const createResp = await fetch(`${DRIVE_API}/files`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const created = await createResp.json();
  return created.id;
}

export async function getLuminaFolderId(): Promise<string> {
  return findOrCreateFolder(LUMINA_FOLDER);
}

export async function listFiles(folderId: string): Promise<DriveFile[]> {
  const headers = await driveHeaders();
  const q = `'${folderId}' in parents and trashed=false`;
  const fields = 'files(id,name,mimeType,modifiedTime,parents)';
  const resp = await fetch(
    `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=${fields}&pageSize=1000&spaces=drive`,
    { headers },
  );
  const data = await resp.json();
  return data.files || [];
}

export async function readTextFile(fileId: string): Promise<string> {
  const headers = await driveHeaders();
  const resp = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, { headers });
  return resp.text();
}

export async function readBlobFile(fileId: string): Promise<Blob> {
  const headers = await driveHeaders();
  const resp = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, { headers });
  return resp.blob();
}

export async function writeTextFile(
  name: string,
  content: string,
  mimeType: string,
  folderId: string,
  existingFileId?: string,
): Promise<DriveFile> {
  const headers = await driveHeaders();

  if (existingFileId) {
    const resp = await fetch(
      `${UPLOAD_API}/files/${existingFileId}?uploadType=media&fields=id,name,mimeType,modifiedTime`,
      {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': mimeType },
        body: content,
      },
    );
    return resp.json();
  }

  const metadata = { name, parents: [folderId], mimeType };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([content], { type: mimeType }));

  const resp = await fetch(
    `${UPLOAD_API}/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime`,
    { method: 'POST', headers: { Authorization: headers.Authorization }, body: form },
  );
  return resp.json();
}

export async function writeBlobFile(
  name: string,
  blob: Blob,
  folderId: string,
  existingFileId?: string,
): Promise<DriveFile> {
  const headers = await driveHeaders();

  if (existingFileId) {
    const resp = await fetch(
      `${UPLOAD_API}/files/${existingFileId}?uploadType=media&fields=id,name,mimeType,modifiedTime`,
      {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': blob.type },
        body: blob,
      },
    );
    return resp.json();
  }

  const metadata = { name, parents: [folderId], mimeType: blob.type };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', blob);

  const resp = await fetch(
    `${UPLOAD_API}/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime`,
    { method: 'POST', headers: { Authorization: headers.Authorization }, body: form },
  );
  return resp.json();
}

export async function deleteFile(fileId: string): Promise<void> {
  const headers = await driveHeaders();
  await fetch(`${DRIVE_API}/files/${fileId}`, { method: 'DELETE', headers });
}
```

- [ ] **Step 2: Write tests with mocked fetch**

```typescript
// v2/packages/drive/src/__tests__/drive-client.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setAuthProvider } from '../auth';
import { listFiles, readTextFile, writeTextFile, findOrCreateFolder } from '../drive-client';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
  setAuthProvider({
    getAccessToken: async () => 'test-token',
    signIn: async () => 'test-token',
    signOut: async () => {},
    getProfile: async () => null,
  });
});

describe('drive-client', () => {
  it('listFiles sends correct auth header and query', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ files: [{ id: 'f1', name: 'settings.json', mimeType: 'application/json', modifiedTime: '2026-01-01T00:00:00Z' }] }),
    });

    const files = await listFiles('folder-id');
    expect(files).toHaveLength(1);
    expect(files[0].name).toBe('settings.json');

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('folder-id');
    expect(opts.headers.Authorization).toBe('Bearer test-token');
  });

  it('readTextFile fetches file content', async () => {
    mockFetch.mockResolvedValueOnce({
      text: async () => '{"themes":["cosmic"]}',
    });

    const content = await readTextFile('file-id');
    expect(content).toBe('{"themes":["cosmic"]}');

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('file-id');
    expect(url).toContain('alt=media');
  });

  it('writeTextFile creates new file with multipart upload', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ id: 'new-file', name: 'test.json', mimeType: 'application/json', modifiedTime: '2026-01-01T00:00:00Z' }),
    });

    const result = await writeTextFile('test.json', '{}', 'application/json', 'folder-id');
    expect(result.id).toBe('new-file');

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('uploadType=multipart');
    expect(opts.method).toBe('POST');
  });

  it('writeTextFile updates existing file with PATCH', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ id: 'existing', name: 'test.json', mimeType: 'application/json', modifiedTime: '2026-01-01T00:00:00Z' }),
    });

    const result = await writeTextFile('test.json', '{}', 'application/json', 'folder-id', 'existing');
    expect(result.id).toBe('existing');

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('existing');
    expect(opts.method).toBe('PATCH');
  });

  it('findOrCreateFolder returns existing folder', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ files: [{ id: 'existing-folder', name: 'Lumina' }] }),
    });

    const id = await findOrCreateFolder('Lumina');
    expect(id).toBe('existing-folder');
  });

  it('findOrCreateFolder creates folder when not found', async () => {
    mockFetch
      .mockResolvedValueOnce({ json: async () => ({ files: [] }) })
      .mockResolvedValueOnce({ json: async () => ({ id: 'new-folder' }) });

    const id = await findOrCreateFolder('Lumina');
    expect(id).toBe('new-folder');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd v2 && npx turbo test --filter=@lumina/drive
```

Expected: All tests pass.

- [ ] **Step 4: Update exports**

```typescript
// v2/packages/drive/src/index.ts
export { setAuthProvider, getAccessToken, isSignedIn } from './auth';
export type { AuthProvider, UserProfile } from './auth';
export {
  getLuminaFolderId, findOrCreateFolder, listFiles,
  readTextFile, readBlobFile, writeTextFile, writeBlobFile, deleteFile,
} from './drive-client';
export type { DriveFile } from './drive-client';
```

- [ ] **Step 5: Commit**

```bash
git add v2/packages/drive/
git commit -m "feat: add Google Drive API client with file CRUD operations"
```

---

## Phase 4: Sync Engine

The sync engine ties IndexedDB and Google Drive together. It handles push, pull, change detection, debouncing, and the offline queue. Lives in `packages/drive` (not `packages/core`) to avoid a circular dependency — it imports from both `@lumina/core` (types, storage) and the drive client (same package).

### Task 13: Sync engine — core logic

**Files:**
- Create: `v2/packages/drive/src/sync.ts`
- Test: `v2/packages/drive/src/__tests__/sync.test.ts`

- [ ] **Step 1: Create sync.ts**

```typescript
// v2/packages/drive/src/sync.ts
import { storage, noteToMarkdown, markdownToNote } from '@lumina/core';
import type { SyncDomain, SyncMeta, PendingChange, Note } from '@lumina/core';
import {
  getLuminaFolderId, findOrCreateFolder, listFiles,
  readTextFile, writeTextFile, deleteFile,
} from './drive-client';
import { isSignedIn } from './auth';
import type { DriveFile } from './drive-client';

let syncInProgress = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

const JSON_FILES: Record<string, SyncDomain> = {
  'settings.json': 'settings',
  'quick-links.json': 'quickLinks',
  'kindling.json': 'kindling',
  'bookmarks.json': 'bookmarks',
  'wallpapers-manifest.json': 'wallpapers',
};

const DOMAIN_TO_FILE: Record<string, string> = Object.fromEntries(
  Object.entries(JSON_FILES).map(([file, domain]) => [domain, file]),
);

export type SyncStatus = 'idle' | 'syncing' | 'connected' | 'disconnected' | 'error';
export type SyncListener = (status: SyncStatus, message: string) => void;

let statusListeners: SyncListener[] = [];
export function onSyncStatus(listener: SyncListener) {
  statusListeners.push(listener);
  return () => { statusListeners = statusListeners.filter(l => l !== listener); };
}
function emitStatus(status: SyncStatus, message: string) {
  statusListeners.forEach(l => l(status, message));
}

export async function markDirty(domain: SyncDomain, noteId?: string): Promise<void> {
  const meta = await storage.getSyncMeta();
  const change: PendingChange = { domain, timestamp: new Date().toISOString() };
  if (noteId) change.noteId = noteId;
  meta.pendingChanges.push(change);
  await storage.setSyncMeta(meta);
}

export function schedulePush(): void {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => { pushTimer = null; pushChanges(); }, 3000);
}

export function flushPush(): void {
  if (pushTimer) { clearTimeout(pushTimer); pushTimer = null; }
  pushChanges();
}

async function pushChanges(): Promise<void> {
  if (syncInProgress || !(await isSignedIn())) return;
  syncInProgress = true;
  emitStatus('syncing', 'Pushing changes...');

  try {
    const meta = await storage.getSyncMeta();
    if (!meta.pendingChanges.length) { syncInProgress = false; return; }

    const folderId = await getLuminaFolderId();
    const remoteFiles = await listFiles(folderId);
    const fileMap = new Map(remoteFiles.map(f => [f.name, f]));

    const domains = new Set(meta.pendingChanges.map(c => c.domain));
    const noteIds = new Set(
      meta.pendingChanges.filter(c => c.domain === 'notes' && c.noteId).map(c => c.noteId!),
    );

    for (const domain of domains) {
      if (domain === 'notes') {
        await pushNotes(folderId, fileMap, noteIds);
      } else {
        await pushJsonDomain(domain, folderId, fileMap);
      }
    }

    meta.pendingChanges = [];
    await storage.setSyncMeta(meta);

    const t = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    emitStatus('connected', `Synced — ${t}`);
  } catch (err) {
    emitStatus('error', `Sync error: ${(err as Error).message}`);
  } finally {
    syncInProgress = false;
  }
}

async function pushJsonDomain(
  domain: SyncDomain,
  folderId: string,
  fileMap: Map<string, DriveFile>,
): Promise<void> {
  const fileName = DOMAIN_TO_FILE[domain];
  const existing = fileMap.get(fileName);

  let data: unknown;
  switch (domain) {
    case 'settings': data = await storage.getSettings(); break;
    case 'quickLinks': data = await storage.getQuickLinks(); break;
    case 'kindling': data = await storage.getKindling(); break;
    case 'bookmarks': data = await storage.getBookmarks(); break;
    case 'wallpapers': data = await storage.getWallpapers(); break;
  }

  await writeTextFile(fileName, JSON.stringify(data, null, 2), 'application/json', folderId, existing?.id);

  const meta = await storage.getSyncMeta();
  meta.timestamps[domain] = new Date().toISOString();
  await storage.setSyncMeta(meta);
}

async function pushNotes(
  folderId: string,
  fileMap: Map<string, DriveFile>,
  dirtyNoteIds: Set<string>,
): Promise<void> {
  const notesFolderId = await findOrCreateFolder('notes', folderId);
  const remoteNoteFiles = await listFiles(notesFolderId);
  const remoteByName = new Map(remoteNoteFiles.map(f => [f.name, f]));

  const localNotes = await storage.getNotes();

  for (const note of localNotes) {
    if (!dirtyNoteIds.has(note.id)) continue;
    const fileName = `${note.id}.md`;
    const existing = remoteByName.get(fileName);
    const md = noteToMarkdown(note);
    await writeTextFile(fileName, md, 'text/markdown', notesFolderId, existing?.id);
  }

  const meta = await storage.getSyncMeta();
  if (!meta.timestamps.notes) meta.timestamps.notes = {};
  for (const noteId of dirtyNoteIds) {
    meta.timestamps.notes[noteId] = new Date().toISOString();
  }
  await storage.setSyncMeta(meta);
}

export async function pullAll(): Promise<void> {
  if (syncInProgress || !(await isSignedIn())) return;
  syncInProgress = true;
  emitStatus('syncing', 'Pulling from Drive...');

  try {
    const folderId = await getLuminaFolderId();
    const remoteFiles = await listFiles(folderId);
    const meta = await storage.getSyncMeta();

    for (const file of remoteFiles) {
      const domain = JSON_FILES[file.name];
      if (!domain) continue;

      const localTime = meta.timestamps[domain];
      if (localTime && new Date(localTime) >= new Date(file.modifiedTime)) continue;

      const content = await readTextFile(file.id);
      const parsed = JSON.parse(content);

      switch (domain) {
        case 'settings': await storage.setSettings(parsed); break;
        case 'quickLinks': await storage.setQuickLinks(parsed); break;
        case 'kindling': await storage.setKindling(parsed); break;
        case 'bookmarks': await storage.setBookmarks(parsed); break;
        case 'wallpapers': await storage.setWallpapers(parsed); break;
      }

      meta.timestamps[domain] = file.modifiedTime;
    }

    await pullNotes(folderId, meta);

    meta.lastFullSync = new Date().toISOString();
    await storage.setSyncMeta(meta);

    const t = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    emitStatus('connected', `Synced — ${t}`);
  } catch (err) {
    emitStatus('error', `Sync error: ${(err as Error).message}`);
  } finally {
    syncInProgress = false;
  }
}

async function pullNotes(folderId: string, meta: SyncMeta): Promise<void> {
  const notesFolderFiles = await listFiles(folderId);
  const notesFolder = notesFolderFiles.find(f => f.name === 'notes' && f.mimeType === 'application/vnd.google-apps.folder');
  if (!notesFolder) return;

  const remoteNoteFiles = await listFiles(notesFolder.id);
  const localNotes = await storage.getNotes();
  const localById = new Map(localNotes.map(n => [n.id, n]));
  const pulledIds = new Set<string>();

  if (!meta.timestamps.notes) meta.timestamps.notes = {};

  for (const file of remoteNoteFiles) {
    if (!file.name.endsWith('.md')) continue;
    const noteId = file.name.replace(/\.md$/, '');
    const localTime = meta.timestamps.notes[noteId];

    if (localTime && new Date(localTime) >= new Date(file.modifiedTime)) {
      pulledIds.add(noteId);
      continue;
    }

    const md = await readTextFile(file.id);
    const note = markdownToNote(md);
    localById.set(note.id, note);
    meta.timestamps.notes[noteId] = file.modifiedTime;
    pulledIds.add(note.id);
  }

  const merged = Array.from(localById.values());
  await storage.setNotes(merged);
}

export function setupSyncListeners(): () => void {
  const onFocus = () => { pullAll(); };
  const onBeforeUnload = () => { flushPush(); };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') onFocus();
  });
  window.addEventListener('pagehide', onBeforeUnload);

  return () => {
    document.removeEventListener('visibilitychange', onFocus);
    window.removeEventListener('pagehide', onBeforeUnload);
  };
}
```

- [ ] **Step 2: Write test (testing markDirty and scheduling, not actual Drive calls)**

```typescript
// v2/packages/drive/src/__tests__/sync.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { storage } from '@lumina/core';
import { markDirty } from '../sync';

beforeEach(async () => {
  await storage.clearAll();
});

describe('sync', () => {
  it('markDirty adds a pending change', async () => {
    await markDirty('settings');
    const meta = await storage.getSyncMeta();
    expect(meta.pendingChanges).toHaveLength(1);
    expect(meta.pendingChanges[0].domain).toBe('settings');
  });

  it('markDirty for notes includes noteId', async () => {
    await markDirty('notes', 'note-123');
    const meta = await storage.getSyncMeta();
    expect(meta.pendingChanges[0].noteId).toBe('note-123');
  });

  it('accumulates multiple dirty marks', async () => {
    await markDirty('settings');
    await markDirty('quickLinks');
    await markDirty('notes', 'n1');
    const meta = await storage.getSyncMeta();
    expect(meta.pendingChanges).toHaveLength(3);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd v2 && npx turbo test --filter=@lumina/drive
```

Expected: All tests pass.

- [ ] **Step 4: Export sync from drive package and commit**

Add to `v2/packages/drive/src/index.ts`:
```typescript
export { markDirty, schedulePush, flushPush, pullAll, setupSyncListeners, onSyncStatus } from './sync';
export type { SyncStatus, SyncListener } from './sync';
```

```bash
git add v2/packages/drive/src/
git commit -m "feat: add sync engine with push/pull, dirty tracking, and event listeners"
```

---

## Phase 5: Shared UI Components

Port all visual components from the vanilla JS `newtab.js` + `newtab.html` to React components in `packages/ui`. This is the largest phase. Each task covers a logical group of related components.

**CSS approach:** Port the existing CSS from `newtab.html` into CSS modules or a single `globals.css` in `packages/ui`. The existing CSS variables (`:root` block) become the design system foundation. Tailwind CSS can be used for layout utilities, but preserve the existing glass-morphism / dark theme aesthetic exactly.

### Task 14: CSS foundation and layout shell

**Files:**
- Create: `v2/packages/ui/src/styles/globals.css` — port `:root` variables, base resets, glass styles, wallpaper styles from `newtab.html`
- Create: `v2/packages/ui/src/components/LuminaShell.tsx` — the main page layout (background canvas, wallpaper div, grain overlay, main content area, side panel slots)
- Create: `v2/packages/ui/src/components/LuminaShell.module.css`

Port the CSS from `newtab.html:11-100` (`:root` variables, body styles, wallpaper classes) plus the overall page layout structure. The shell provides slots for the main content area and the side panel.

- [ ] Steps: Port CSS variables, create shell component with background/wallpaper/grain layers, verify it renders in both Next.js dev and WXT dev.
- [ ] Commit

### Task 15: Background renderer (canvas animated blobs)

**Files:**
- Create: `v2/packages/ui/src/components/BackgroundCanvas.tsx`
- Create: `v2/packages/core/src/themes.ts` — port the `THEMES` object from `newtab.js:79-152`

Port the canvas-based animated background from `newtab.js:154-244`. The React component uses a `<canvas>` ref with `requestAnimationFrame`. The `THEMES` constant (color palettes, previews) moves to `packages/core/src/themes.ts` since it's shared data.

- [ ] Steps: Port THEMES data, create BackgroundCanvas component with useRef + useEffect for animation loop, handle resize, intensity settings. Test render in browser.
- [ ] Commit

### Task 16: Clock, Date, and Greeting

**Files:**
- Create: `v2/packages/ui/src/components/Clock.tsx`

Port `newtab.js:247-267`. Single component showing time, date, and greeting. Updates every second via `setInterval`. Reads `greetingName`, `greetingCustom`, `greetingCustomText` from settings.

- [ ] Steps: Create component with useEffect interval, format time/date/greeting, style matching existing CSS.
- [ ] Commit

### Task 17: Search bar

**Files:**
- Create: `v2/packages/ui/src/components/SearchBar.tsx`
- Create: `v2/packages/core/src/search-engines.ts` — port `SEARCH_URLS` from `newtab.js:270-281`

Port `newtab.js:269-300`. The search bar with engine selection. Opens results in a new tab.

- [ ] Steps: Port SEARCH_URLS data, create SearchBar component with input + submit, read searchEngine from settings.
- [ ] Commit

### Task 18: Heroicons SVG library

**Files:**
- Create: `v2/packages/ui/src/components/Heroicon.tsx`

Port `newtab.js:374-437`. A component that renders Heroicon SVGs by name. The icon path data stays as a constant map.

- [ ] Steps: Port HEROICONS map, create Heroicon component accepting name + size props.
- [ ] Commit

### Task 19: Favicon helper

**Files:**
- Create: `v2/packages/ui/src/components/Favicon.tsx`

Port `newtab.js:302-372`. Component that shows a site's favicon from Google's favicon service, with fallback to a letter initial if the icon is generic/missing.

- [ ] Steps: Port favicon URL builder, generic detection logic, fallback rendering. Create Favicon component with url + label props.
- [ ] Commit

### Task 20: Quick Links grid

**Files:**
- Create: `v2/packages/ui/src/components/QuickLinks.tsx`
- Create: `v2/packages/ui/src/components/QuickLinkItem.tsx`
- Create: `v2/packages/ui/src/components/QuickLinkSection.tsx`
- Create: `v2/packages/ui/src/components/QuickLinkModal.tsx`

Port `newtab.js:499-876`. The quick links grid with sections, icon mode, drag-to-reorder, add/edit modal with icon picker and favicon background options. This is one of the most complex UI pieces.

- [ ] Steps: Create section headers, link items (list + icon mode), drag reorder with native drag events or dnd-kit, add/edit modal with icon picker + URL/label/favicon fields. Read/write QuickLinksData via storage.
- [ ] Commit

### Task 21: Settings panel — themes and wallpapers

**Files:**
- Create: `v2/packages/ui/src/components/SettingsPanel.tsx` — the panel container + tab navigation
- Create: `v2/packages/ui/src/components/settings/ThemeGrid.tsx`
- Create: `v2/packages/ui/src/components/settings/WallpaperGrid.tsx`

Port `newtab.js:877-1260`. Theme grid with multi-select, wallpaper grid with Bing + Google Drive, upload via Drive, emoji picker, edit/delete cards. The wallpaper section changes from the current URL/file upload approach to Google Drive integration.

- [ ] Steps: Port theme grid with selection toggle, create wallpaper grid with Bing + Drive sources, implement Drive file picker (uses `@lumina/drive`), port emoji picker for wallpaper labels.
- [ ] Commit

### Task 22: Settings panel — general settings

**Files:**
- Create: `v2/packages/ui/src/components/settings/GeneralSettings.tsx`
- Create: `v2/packages/ui/src/components/settings/WeatherSettings.tsx`
- Create: `v2/packages/ui/src/components/settings/GreetingSettings.tsx`
- Create: `v2/packages/ui/src/components/settings/SyncSettings.tsx`

Port the remaining settings sections from `newtab.js:1261-1741` and the sync settings. General settings includes: search engine selector, toggle switches (clock, quote, grain, animate, panel theme), focus lines editor. Sync settings replaces the Asana UI with Google sign-in + sync status + export buttons.

- [ ] Steps: Port each settings group as its own component. SyncSettings gets Google sign-in button, sync status bar, manual sync button, export buttons. Replace all Asana-related UI.
- [ ] Commit

### Task 23: Focus lines / daily quote

**Files:**
- Create: `v2/packages/ui/src/components/FocusLine.tsx`

Port `newtab.js:1261-1741` (the focus lines section). Shows a rotating daily affirmation/quote. Reads from settings or falls back to defaults.

- [ ] Steps: Port DEFAULT_FOCUS_LINES data, create component that picks today's line and renders it.
- [ ] Commit

### Task 24: Weather widget

**Files:**
- Create: `v2/packages/ui/src/components/Weather.tsx`
- Create: `v2/packages/core/src/weather.ts` — port WMO codes, fetch logic from `newtab.js:1742-1838`

Port weather fetching (Open-Meteo API) and display. Caches result in IndexedDB instead of localStorage.

- [ ] Steps: Port WMO icon/label maps, geocoding + weather fetch, create Weather component with cached data, link to Google search on click.
- [ ] Commit

### Task 25: Bible verses

**Files:**
- Create: `v2/packages/ui/src/components/BibleVerse.tsx`
- Create: `v2/packages/core/src/bible-verses.ts` — port VERSE_REFS from `newtab.js:1840-1907`

Port bible verse display — fetches from bible-api.com, shows verse text with link to bible.com.

- [ ] Steps: Port verse refs data, fetch logic, create component.
- [ ] Commit

### Task 26: Notes panel (TipTap editor)

**Files:**
- Create: `v2/packages/ui/src/components/NotesPanel.tsx`
- Create: `v2/packages/ui/src/components/NoteEditor.tsx`
- Create: `v2/packages/ui/src/components/NoteTabBar.tsx`

Port `newtab.js:1928-1957` + the TipTap editor setup. The note panel with tab bar for switching between Notes, Bookmarks, and Kindling. The TipTap editor with all existing extensions (highlight, link, placeholder, tables, task lists, text align, typography, underline, markdown).

TipTap dependencies move from the root `package.json` to `packages/ui/package.json`.

- [ ] Steps: Set up TipTap with React integration (@tiptap/react), port all extensions from existing package.json, create NoteEditor component with toolbar, create NoteTabBar for note switching + add/delete, wire to storage.setNotes().
- [ ] Commit

### Task 27: Bookmarks tree

**Files:**
- Create: `v2/packages/ui/src/components/BookmarksTree.tsx`
- Create: `v2/packages/ui/src/components/BookmarkNode.tsx`
- Create: `v2/packages/ui/src/components/BookmarkModal.tsx`

Port `newtab.js:1958-2568`. Recursive tree rendering with expand/collapse, folder CRUD (create, rename, delete), bookmark CRUD (add, edit, delete). Uses Chrome Bookmarks API in extension context, Lumina's own bookmarks data in web context.

- [ ] Steps: Create recursive BookmarkNode component, implement folder toggle, CRUD modals, wire to storage for Lumina bookmarks. Extension-specific Chrome Bookmarks API import handled via a platform check.
- [ ] Commit

### Task 28: Kindling (reading list)

**Files:**
- Create: `v2/packages/ui/src/components/KindlingPanel.tsx`
- Create: `v2/packages/ui/src/components/KindlingItem.tsx`
- Create: `v2/packages/ui/src/components/KindlingFilters.tsx`
- Create: `v2/packages/ui/src/components/KindlingModal.tsx`

Port `newtab.js:2888-3237`. The reading list with tag management, filtering (by tag + read status), sorting (date/title), add/edit modal with tag selection.

- [ ] Steps: Port tag colors, filter chips, sort logic, create KindlingPanel with filter bar + item list, KindlingModal for add/edit with tag picker.
- [ ] Commit

### Task 29: Toast notifications

**Files:**
- Create: `v2/packages/ui/src/components/Toast.tsx`

Port `newtab.js:2569-2582`. Simple toast notification system.

- [ ] Steps: Create Toast component with show/hide animation, expose showToast() via context or a module-level function.
- [ ] Commit

### Task 30: Export functionality

**Files:**
- Create: `v2/packages/core/src/export.ts`

Port `newtab.js:2583-2664` + the export buttons from sync settings. Generates markdown for links/kindling and JSON for full data export. "Export All Data" produces a zip matching the Drive folder structure.

- [ ] Steps: Port buildQuickLinksMarkdown, buildSavedLinksMarkdown, downloadTextFile. Add new exportAll() function that creates a zip (using JSZip or similar).
- [ ] Commit

### Task 31: Bookmark sync (Chrome → Lumina import)

**Files:**
- Create: `v2/packages/ui/src/components/BookmarkSyncModal.tsx`

Port `newtab.js:2665-2887`. The modal for selecting a Chrome bookmark folder and importing its contents as quick links. Extension-only — in the web companion this component is not rendered.

- [ ] Steps: Port folder picker, preview grid, apply logic. Gate rendering on `typeof chrome !== 'undefined' && chrome.bookmarks`.
- [ ] Commit

### Task 32: Setup wizard (v1 → v2 migration)

**Files:**
- Create: `v2/packages/ui/src/components/SetupWizard.tsx`

Replace the current Asana-focused setup wizard (`newtab.js:3830-3917`) with a new wizard for v2:
1. Welcome step — "Lumina has been upgraded"
2. Migration step — detects old localStorage data, offers to import
3. Sign-in step — Google OAuth (optional, can skip)
4. Done step

- [ ] Steps: Create multi-step wizard component, implement localStorage detection + migration logic, Google sign-in integration.
- [ ] Commit

### Task 33: Address book / auto-fill (extension only)

**Files:**
- Create: `v2/packages/ui/src/components/settings/AddressBookSettings.tsx`

Port the address book management UI from the settings panel. The actual autofill functionality lives in the background service worker (Task 35).

- [ ] Steps: Port address book entry CRUD, store in settings or its own IndexedDB store.
- [ ] Commit

---

## Phase 6: App Integration

Wire the shared components into both app shells.

### Task 34: Wire up apps/web (Next.js)

**Files:**
- Modify: `v2/apps/web/app/layout.tsx`
- Modify: `v2/apps/web/app/page.tsx`
- Create: `v2/apps/web/app/providers.tsx` — React context for storage, auth, sync
- Create: `v2/apps/web/lib/web-auth-provider.ts` — GIS-based AuthProvider implementation

- [ ] Steps:
  1. Implement `WebAuthProvider` using Google Identity Services `initTokenClient`
  2. Create providers wrapper (storage init, auth init, sync setup)
  3. Compose LuminaShell + all shared components in page.tsx
  4. Add Google Fonts (Inter) to layout.tsx
  5. Add globals.css import
  6. Test: `npm run dev` in apps/web, verify full UI renders
- [ ] Commit

### Task 35: Wire up apps/extension (WXT)

**Files:**
- Modify: `v2/apps/extension/entrypoints/newtab/main.tsx`
- Create: `v2/apps/extension/lib/extension-auth-provider.ts` — chrome.identity-based AuthProvider
- Modify: `v2/apps/extension/entrypoints/background.ts` — port context menu + autofill from existing `background.js`
- Create: `v2/apps/extension/entrypoints/content/gemini.ts`
- Create: `v2/apps/extension/entrypoints/content/claude-ai.ts`
- Create: `v2/apps/extension/entrypoints/content/chatgpt.ts`

- [ ] Steps:
  1. Implement `ExtensionAuthProvider` using `chrome.identity.getAuthToken`
  2. Compose LuminaShell + all shared components in newtab main.tsx
  3. Port background.js service worker (context menus, autofill injection) to WXT's `defineBackground`
  4. Port content scripts — these are small (~75 lines each), just copy and adapt to WXT's `defineContentScript` format
  5. Update wxt.config.ts manifest with all required permissions
  6. Test: `npx wxt` → load extension in Chrome, verify new tab works
- [ ] Commit

### Task 36: v1 → v2 data migration

**Files:**
- Create: `v2/packages/core/src/migration.ts`
- Test: `v2/packages/core/src/__tests__/migration.test.ts`

Detects existing v1 data in localStorage / chrome.storage.local and migrates to IndexedDB.

- [ ] **Step 1: Write migration.ts**

```typescript
// v2/packages/core/src/migration.ts
import { storage } from './storage';
import type { LuminaSettings, QuickLinksData, Note, KindlingData } from './types';
import { DEFAULT_SETTINGS, DEFAULT_QUICK_LINKS, DEFAULT_KINDLING } from './defaults';

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
    id: l.id, url: l.url, label: l.label, favicon: l.favicon,
    section: l.section || 'default', fromBookmark: l.fromBookmark || false,
    iconName: l.iconName || null, faviconBg: l.faviconBg || undefined,
  }));
  const sections = (v1State.qlSections || [{ id: 'default', label: 'Quick Links' }]);
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

  // Kindling (from chrome.storage.local or localStorage)
  let kindlingData: KindlingData = { ...DEFAULT_KINDLING };
  const savedRaw = localStorage.getItem('lumina_saved');
  if (savedRaw) {
    const saved = JSON.parse(savedRaw);
    kindlingData = {
      items: (saved.links || []).map((l: any, i: number) => ({
        id: l.id || `kl-${Date.now()}-${i}`,
        url: l.url, title: l.title, favicon: l.favicon,
        tags: l.tags || [], readAt: l.readAt || null,
        sortOrder: i, updatedAt: now,
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
```

- [ ] **Step 2: Write test**

```typescript
// v2/packages/core/src/__tests__/migration.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { storage } from '../storage';
import { migrateFromV1, hasV1Data } from '../migration';

beforeEach(async () => {
  await storage.clearAll();
  localStorage.clear();
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
```

- [ ] **Step 3: Run tests**

```bash
cd v2 && npx turbo test --filter=@lumina/core
```

Expected: All tests pass.

- [ ] **Step 4: Export and commit**

```bash
git add v2/packages/core/src/
git commit -m "feat: add v1 to v2 data migration with Asana cleanup"
```

---

## Phase 7: Testing & Deployment

### Task 37: Playwright E2E tests for web companion

**Files:**
- Create: `v2/apps/web/e2e/basic.spec.ts`
- Create: `v2/apps/web/playwright.config.ts`

- [ ] Steps:
  1. Install Playwright: `npx playwright install`
  2. Create config pointing at the Next.js dev server
  3. Write basic E2E tests: page loads, clock visible, search bar works, quick links render, notes panel opens/closes
  4. Mock Google OAuth (no real sign-in in tests)
  5. Run: `npx playwright test`
- [ ] Commit

### Task 38: Cloudflare Pages deployment

**Files:**
- Create: `v2/apps/web/wrangler.toml` (if using Wrangler CLI)

- [ ] Steps:
  1. Build: `cd v2/apps/web && npm run build` — produces static export in `out/`
  2. Deploy manually via Wrangler: `npx wrangler pages deploy out/ --project-name=lumina`
  3. Or set up Cloudflare Pages GitHub integration pointing at `v2/apps/web`
  4. Verify: visit the Cloudflare Pages URL, confirm the app loads
- [ ] Commit

### Task 39: GCP project setup

This is a manual task — not code.

- [ ] Create a Google Cloud project (free tier)
- [ ] Enable the Google Drive API
- [ ] Create an OAuth 2.0 client ID for the web app (authorized origin: Cloudflare Pages domain)
- [ ] Create an OAuth 2.0 client ID for the Chrome extension (uses extension ID)
- [ ] Update `v2/apps/extension/wxt.config.ts` with real client ID
- [ ] Update `v2/apps/web/lib/web-auth-provider.ts` with real client ID
- [ ] Commit the non-secret config updates

### Task 40: Final integration verification

- [ ] Load extension in Chrome via `wxt build` → manually load unpacked
- [ ] Open new tab — full Lumina UI renders
- [ ] Sign in with Google in extension — verify Drive folder created
- [ ] Create a note, edit a quick link, add a kindling item
- [ ] Open web companion in a different browser — sign in
- [ ] Verify all data synced correctly
- [ ] Upload a wallpaper via Google Drive — verify it appears on both
- [ ] Test offline: disconnect network, make changes, reconnect — verify sync
- [ ] Test migration: install v1 extension, populate data, upgrade to v2, verify migration
- [ ] Content scripts: open claude.ai, gemini, chatgpt — verify they work
