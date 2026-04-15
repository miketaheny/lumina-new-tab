# Lumina — New Tab Page

A Chrome extension that replaces your new tab page with an AI-powered workspace: animated backgrounds, wallpapers, search, quick links, rich-text notes, Kindling reading list, a full bookmarks tree, live weather, daily focus, customizable greeting, and more.

> **Feature documentation** is built into the app — click the **?** button in the top bar for the full user guide.

---

## Installation — Chrome

Lumina is loaded as an unpacked extension (no Web Store listing).

1. **Download or clone** this repository to a local folder.
2. Open Chrome and go to `chrome://extensions`.
3. Enable **Developer Mode** (toggle in the top-right corner).
4. Click **Load unpacked** and select the folder containing `manifest.json`.
5. Open a new tab — Lumina is now active.

### Keeping it updated

After changing any file, click the **refresh icon** on the Lumina card at `chrome://extensions`.

---

## Installation — Firefox

1. Open Firefox and go to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…** and select the `manifest.json` file.
3. The extension loads for the current session (reloads on Firefox restart; use Firefox Developer Edition or a signed extension for persistence).

---

## Installation — Safari (macOS)

Safari extensions must be wrapped in a native app using Xcode.

### Requirements
- macOS with Xcode installed (`xcode-select --install`)
- Safari 14 or later

### Steps

1. **Convert** the extension from your terminal:
   ```bash
   xcrun safari-web-extension-converter /path/to/newtab-extension \
     --project-location ~/Desktop \
     --app-name "Lumina"
   ```
2. **Open** the generated Xcode project (`~/Desktop/Lumina/Lumina.xcodeproj`).
3. In Xcode, select your Mac as the run destination and press **Run** (⌘R). This builds and installs the wrapper app.
4. Open Safari → **Settings → Extensions** → enable **Lumina**.
5. Open a new tab.

### After code changes

Re-run the app from Xcode (⌘R) to pick up changes. You do not need to re-run `safari-web-extension-converter` unless the manifest changes.

### New Tab override in Safari

Safari requires explicit permission to override the new tab page. After enabling the extension, Safari may prompt you to allow it — click **Allow** or enable it in **Safari → Settings → Extensions → Lumina → Permissions**.

---

## Sync via Asana (Personal Access Token)

Notes sync as tasks in a private Asana project named **Lumina Notes**, created automatically the first time you connect. Each note is one task; note title = task name, note body = task `html_notes`. The project is created with `privacy_setting: 'private'` so only you (the creator) can see it.

### Setup

1. Create a **Personal Access Token** at [app.asana.com/0/my-apps](https://app.asana.com/0/my-apps) → **+ Create new token**. Copy it — you won't see it again.
2. In Lumina, open **Settings → Sync** and paste the token into the **Asana Personal Access Token** field.
3. If you belong to more than one workspace, pick the one to use from the dropdown.
4. Click **Connect**. Lumina creates the **Lumina Notes** private project and pushes any existing local notes as new tasks.

### How it works

| Behavior | Details |
|---|---|
| **Auto-push** | 3 seconds after any change, then flushed when the tab is hidden, window loses focus, or tab is closed |
| **Auto-pull** | When you switch back to the Lumina tab (and it's been >30s since last sync), it checks Asana for task edits newer than your local copy |
| **Conflict handling** | Last write wins, based on `modified_at`. If you edited in both places, the most recently modified version is kept |
| **Deletes** | Deleting a note marks its Asana task complete (reversible — uncomplete the task in Asana to restore) |
| **Renames** | Renaming a note title updates the task name |
| **Status bar** | The notes panel shows a live connection indicator (green = connected, blue = syncing, red = disconnected) |
| **Not configured** | The extension works normally without sync — notes are saved locally |

### Exports

Quick Links, Saved Links, and your settings JSON can be downloaded from **Settings → Sync** as `.md` / `.json` files for manual backup.

---

## Permissions

| Permission | Purpose |
|---|---|
| `storage` | Saves Saved Links in `chrome.storage.local`, shared between new tab and browser popup |
| `bookmarks` | Reads and writes Chrome bookmark folders for bidirectional Quick Links sync |
| `activeTab` | Lets the browser popup read the current tab's URL and title |

### External requests

| Domain | Purpose |
|---|---|
| `open-meteo.com` | Weather forecast and geocoding (free, no API key) |
| `bible-api.com` | Daily Bible verse (one request per day) |
| `app.asana.com` | Asana notes sync (only when connected with a PAT) |
| `www.bing.com` | Bing Daily wallpaper (only when selected) |
| `api.nasa.gov` | NASA Astronomy Picture of the Day wallpaper (only when selected; uses `DEMO_KEY`) |
| `en.wikipedia.org` | Wikimedia Picture of the Day wallpaper (only when selected) |

No personal data leaves your browser except through services you explicitly configure (Asana sync).

---

## File structure

```
newtab-extension/
├── manifest.json        # Chrome Extension Manifest V3
├── newtab.html          # Main new tab page — all CSS inline
├── newtab.js            # Main new tab page JavaScript
├── tiptap-bundle.js     # Bundled Tiptap rich-text editor (built from src/)
├── src/
│   └── tiptap-bundle.js # Tiptap editor source — edit this, then run `node build.js`
├── build.js             # esbuild script to bundle src/tiptap-bundle.js
├── package.json         # Node dependencies (Tiptap, esbuild)
├── gemini.js            # Content script: populates Gemini's chat input from ?q=
├── claude-ai.js         # Content script: populates Claude's chat input from ?q= and submits
├── chatgpt.js           # Content script: populates ChatGPT's chat input from ?q= and submits
├── popup.html           # Browser action popup UI
├── popup.js             # Browser action popup logic
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```
