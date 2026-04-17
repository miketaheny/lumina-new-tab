# Lumina v2 — Companion Web App & Extension Rewrite

Full rewrite of Lumina New Tab into a shared codebase that produces both a Chrome MV3 extension and a standalone web companion. Replaces the current Asana sync with Google Drive as a client-side-only storage backend.

## Goals

1. **Multi-device access** — Lumina available on any browser, not just Chrome with the extension installed
2. **Drop Asana dependency** — purpose-built sync via Google Drive, no third-party task manager as a storage hack
3. **Single codebase** — shared React components and business logic for both extension and web
4. **User owns their data** — all data lives in the user's own Google Drive as readable files
5. **Zero server cost** — no backend, no database, no server-side code

## Architecture

### Monorepo Structure

```
lumina/
├── apps/
│   ├── web/                  # Next.js 15 App Router → static export → Cloudflare Pages
│   │   ├── app/              # Single-page app shell
│   │   ├── next.config.ts
│   │   └── ...
│   └── extension/            # WXT Chrome MV3 extension
│       ├── entrypoints/
│       │   ├── newtab/       # New tab override (React, imports shared components)
│       │   ├── popup/        # Extension popup
│       │   ├── background.ts # Service worker
│       │   └── content/      # Content scripts (gemini, claude-ai, chatgpt)
│       └── wxt.config.ts
├── packages/
│   ├── ui/                   # Shared React components
│   ├── core/                 # Business logic, sync engine, data models
│   └── drive/                # Google Drive client, auth helpers
├── docs/
├── turbo.json
└── package.json              # Turborepo root
```

### Build Targets

- **Web companion:** `next build && next export` → static SPA deployed to Cloudflare Pages
- **Chrome extension:** `wxt build` → MV3 extension package. WXT handles manifest generation, content script bundling, and service worker compilation. Shared React components imported from `packages/ui`.

### Key Technology Choices

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Monorepo | Turborepo | Parallel builds, caching, clean package boundaries |
| UI framework | React 19 | Shared between Next.js and WXT |
| Extension framework | WXT | Purpose-built for MV3 extensions with React. Solves the hardest build pipeline problem. |
| Web framework | Next.js 15 (App Router) | Static export for Cloudflare Pages. Familiar stack. |
| Hosting | Cloudflare Pages | Unlimited bandwidth on free tier, global edge, no cold starts |
| Auth | Google OAuth (GIS + chrome.identity) | Client-side only, no server needed |
| Remote storage | Google Drive (drive.file scope) | User owns data, 15GB free, no server |
| Local storage | IndexedDB | No size limits (vs localStorage/chrome.storage.local), works in both extension and web |
| Rich text editor | TipTap | Already in use, React-compatible |
| Testing | Vitest + React Testing Library + Playwright | Fast unit/component tests, reliable web E2E |

## Data Model

All user data lives in two places: IndexedDB (local, primary read/write) and Google Drive (remote, sync target).

### Google Drive File Structure

```
Lumina/
├── settings.json             # All app settings
├── quick-links.json          # Links array + sections array
├── bookmarks.json            # Tree of folders and bookmarks
├── kindling.json             # Reading list items + tags
├── wallpapers-manifest.json  # Active wallpaper, metadata for all wallpapers
├── notes/
│   ├── <uuid>.md             # One file per note (frontmatter + markdown body)
│   └── ...
└── wallpapers/
    ├── <uuid>.jpg            # User-uploaded images
    └── ...
```

### Notes Format

Individual markdown files with YAML frontmatter:

```markdown
---
id: note-abc123
title: Shopping List
sort_order: 2
updated_at: 2026-04-16T10:30:00Z
---
- Eggs
- Milk
```

### Design Decisions

- **Notes as individual .md files:** Most frequently edited domain. Per-file writes avoid rewriting all notes on every edit. Human-readable in Drive.
- **Everything else as single JSON files:** Quick links, bookmarks, kindling, and settings are small and change less frequently. One read/write per sync cycle is simpler and cheaper on API quota.
- **Each JSON file includes a root `updated_at` field** for change detection during sync.
- **Wallpaper images stored in Drive, cached in IndexedDB.** The `wallpapers-manifest.json` tracks metadata and active selection. Actual image bytes are fetched once and cached locally.

### IndexedDB Schema

```
lumina-cache (database)
├── settings        # Mirror of settings.json
├── quick_links     # Mirror of quick-links.json
├── notes           # Array of note objects (id, title, content, sort_order, updated_at)
├── kindling        # Mirror of kindling.json
├── bookmarks       # Mirror of bookmarks.json
├── wallpapers      # Manifest data + cached image blobs
└── sync_meta       # Last sync timestamps per domain, pending changes queue
```

## Authentication

Client-side only. No server involvement.

### Web Companion

1. User clicks "Sign in with Google"
2. Google Identity Services (GIS) library handles OAuth popup via `initTokenClient`
3. Returns a short-lived access token (1 hour). No refresh token in the implicit flow — GIS silently re-authenticates via `prompt: ''` when the token expires (no user interaction if consent was previously granted). Token stored in memory; re-acquired on page load.
4. Scopes: `profile email` + `https://www.googleapis.com/auth/drive.file`

### Chrome Extension

1. User clicks "Sign in with Google" in settings
2. `chrome.identity.getAuthToken({ interactive: true })` — Chrome's built-in OAuth, uses the Google account already signed into Chrome
3. Returns access token; Chrome manages refresh automatically
4. `drive.file` scope declared in manifest.json `oauth2` section

### Google Cloud Project

One GCP project (free):
- OAuth 2.0 client ID for web (authorized origin: Cloudflare Pages domain)
- OAuth 2.0 client ID for extension (uses extension ID)
- Drive API enabled
- No billing required

### `drive.file` Scope

Lumina can only access files it created. Cannot see the user's other Drive files. Users see a clean, non-scary consent screen.

### Session Lifecycle

- No account creation — Google account is the identity
- Sign out clears tokens, stops sync, keeps local data
- Token refresh handled transparently by GIS / chrome.identity
- Without sign-in, both apps work fully offline (identical to current extension behavior)

## Sync Architecture

Local-first, Drive-synced. Both apps work fully offline. Sync is background and non-blocking.

### Sync Triggers

No polling. Sync fires on:
- **Tab/window focus** (`visibilitychange` event)
- **After local edits** (debounced 3 seconds)
- **Manual "Sync now" button** in settings
- **Tab close / extension unload** (flush pending writes)

### Sync Cycle

**Pull (on focus / manual):**
1. List files in `Lumina/` folder via Drive API (returns `modifiedTime` for each)
2. Compare each file's `modifiedTime` against local `sync_meta` timestamps
3. Download any files newer than local → update IndexedDB → UI reactively updates

**Push (after local edits):**
1. Local write goes to IndexedDB immediately (UI updates instantly)
2. Changed domain marked dirty in `sync_meta`
3. After 3s debounce, write dirty files to Drive
4. On success, update `sync_meta` with new timestamp

**Flush (on tab close):**
- Push any pending dirty writes immediately

### Conflict Resolution

Last-write-wins per file. For notes, per-note (each is its own file). For everything else, per-domain (whole JSON file).

Single-user data across personal devices — conflicts are rare and low-stakes. The worst case is a lost edit to a quick link label. CRDTs/OT would be massive overkill.

### Offline Queue

Every local write enqueues a pending operation in `sync_meta`. Queue persists in IndexedDB across tab/extension restarts. On next connectivity, the sync engine drains the queue.

### API Quota

Google Drive free tier: ~20,000 requests/day per user. A sync cycle is ~1 request to list files + 1 request per changed file. At ~50 tab focuses/day with 6 data domains, that's well under 1,000 requests/day.

## Wallpapers

Two sources:

### Bing Daily Wallpaper
- Fetched via Bing API (existing implementation)
- URL stored in settings
- Image cached in IndexedDB

### Google Drive Uploads
- User picks image from Drive or uploads to Drive via Lumina
- Stored in `Lumina/wallpapers/` folder
- `wallpapers-manifest.json` tracks metadata (label, source, active flag)
- Image fetched once from Drive, cached in IndexedDB
- Served from local cache after initial fetch

### Removed Sources
NASA APOD, Wikimedia POTD, and Spotlight are dropped in v2. Only Bing daily and Google Drive custom uploads remain.

## Web Companion — Layout

Single-page with panels, same layout as the extension:
- Main view: wallpaper, clock, greeting, search bar, quick links, focus lines, quote, weather
- Side panels: notes (TipTap editor), kindling (reading list), bookmarks (tree), settings
- Identical interaction model to the extension

Hosted as a static SPA on Cloudflare Pages. No server-side rendering needed.

## Content Scripts

Extension-only. Three content scripts inject into third-party pages:
- `gemini.js` → gemini.google.com
- `claude-ai.js` → claude.ai
- `chatgpt.js` → chatgpt.com

These live in `apps/extension/entrypoints/content/` and do not import shared UI components. They are excluded from the web build entirely.

## Bookmarks

Dual model:
- **Chrome Bookmarks API** (extension only): one-way import source. User picks a Chrome bookmark folder, its contents are imported into Lumina's bookmark data. Read-only — Lumina never writes back to Chrome bookmarks.
- **Lumina bookmarks** (both apps): full CRUD with folder tree. Stored in `bookmarks.json`, synced via Drive. The web companion can create/edit/delete bookmarks. Changes sync to the extension.

## Migration (v1 → v2)

### First Launch After Update

1. Extension detects existing `lumina_state` in localStorage and `lumina_saved` in chrome.storage.local
2. Migrates all data into IndexedDB
3. Asana sync settings cleared. One-time notice: "Sync has been upgraded. Sign in with Google to enable cloud sync via Google Drive."
4. If user signs in, local data pushes to Drive on first sync
5. Old localStorage keys kept for one version as safety net, then cleaned up in next release

### Import from Asana

Not automated. The last Asana pull already put notes into localStorage, which step 1-2 captures.

### Export

- Keep existing "Export Settings" and "Export Links" buttons
- Add "Export All Data" — downloads a zip matching the Drive folder structure (settings.json, quick-links.json, notes/*.md, etc.)
- Serves as a backup mechanism independent of Google Drive

## Testing

### Unit Tests (packages/core) — Vitest
- Sync engine: merge logic, conflict resolution, change detection, offline queue
- Drive client: mock fetch, verify request construction and response parsing
- Data serialization: JSON ↔ state objects, markdown ↔ note objects with frontmatter
- IndexedDB layer: read/write/delete operations

### Component Tests (packages/ui) — Vitest + React Testing Library
- Shared components render correctly with various props/states
- TipTap editor: note creation, editing, tab switching
- Quick links: CRUD, drag reorder
- Bookmarks: tree rendering, folder operations

### E2E Tests — Playwright (web companion only)
- Sign in (mocked OAuth), create note, verify persistence after reload
- Add quick link, edit, delete, verify sync status
- Extension E2E: manual testing via `wxt dev` (Chrome extension E2E automation is too brittle)

### Not Tested
- Google Drive API (Google's responsibility)
- Google OAuth flow (mock token, test post-auth behavior)
- Visual regression (overkill for personal project)
