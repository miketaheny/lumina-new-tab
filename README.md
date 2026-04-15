# Lumina — New Tab Page

A Chrome extension that replaces your new tab page with an AI-powered workspace: animated backgrounds, wallpapers, search, quick links, rich-text notes, saved reading list, live weather, daily focus, customizable greeting, and more.

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

## Sync via Obsidian (Local REST API)

Notes sync as `.md` files in your Obsidian vault's `Lumina/` folder using the [Local REST API](https://github.com/coddingtonbear/obsidian-local-rest-api) plugin. Settings, links, and saved links are stored in `Lumina/.lumina-sync.json`.

### Setup

1. Install the **Local REST API** plugin in Obsidian and enable it.
2. Copy the API key from the plugin settings.
3. In Lumina, open **Settings → Sync** and enter the REST API URL (default `https://127.0.0.1:27124`) and the API key.
4. Click **Sync Now** to perform the first sync.

### How it works

| Behavior | Details |
|---|---|
| **Auto-push** | 3 seconds after any change (notes, links, settings) |
| **Flush on background** | Pushes immediately when the tab is hidden, the window loses focus, or the tab is closed |
| **Auto-pull on return** | When you switch back to the Lumina tab or refocus the Chrome window, it checks the vault for newer edits — non-conflicting changes are auto-merged into your local notes |
| **Conflict handling** | If a note was edited in **both** Lumina and Obsidian since the last sync, a banner appears letting you choose which version to keep |
| **Manual full sync** | Click **Sync Now** in Settings to do a full pull — files created in Obsidian are imported and files deleted from the vault are removed locally |
| **Renames** | Renaming a note title updates the vault filename and cleans up the old file |
| **Status bar** | The notes panel shows a live connection indicator (green = connected, blue = syncing, red = disconnected) |
| **Not configured** | The extension works normally without sync — notes are saved locally |

### Self-signed certificate

The Local REST API plugin uses HTTPS with a self-signed certificate by default. If you see "Failed to fetch", either:
- Visit `https://127.0.0.1:27124` in your browser and accept the certificate, or
- Use the HTTP endpoint instead: `http://127.0.0.1:27123`

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
| `127.0.0.1:27123/27124` | Obsidian Local REST API sync (only when configured) |
| `www.bing.com` | Bing Daily wallpaper (only when selected) |
| `api.nasa.gov` | NASA Astronomy Picture of the Day wallpaper (only when selected; uses `DEMO_KEY`) |
| `en.wikipedia.org` | Wikimedia Picture of the Day wallpaper (only when selected) |
| `zenquotes.io` | Fetch inspirational quotes for Daily Focus (only when triggered manually) |

No personal data leaves your browser except through services you explicitly configure (Obsidian sync).

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
