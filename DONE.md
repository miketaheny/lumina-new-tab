# DONE

## Features

- [x] FEAT: in side-panel Bookmarks tab, add controls to create, rename, and remove chrome bookmark folders (replacing the old main-panel section add/rename/remove controls)

```RESULT:
Extended bmMakeFolderRow with hover actions: + (new subfolder), edit (rename), delete. Root nodes (ids 0/1/2/3 — Bookmarks Bar/Other/Mobile) only show the + button since Chrome disallows renaming/deleting them. New handlers: bmCreateFolder (prompt title, chrome.bookmarks.create), bmRenameFolder (prompt new title, chrome.bookmarks.update), bmDeleteFolder (confirm with child count, chrome.bookmarks.removeTree). After create, parent is auto-expanded so the new folder is visible — commit: 440b0a6 2026.04.15 15:06:06
```

- [x] FEAT: render Quick Links inside the side-panel Bookmarks tab (above the chrome bookmarks tree)

```RESULT:
Added a Quick Links section inside the side-panel Bookmarks tab, above the chrome bookmarks tree. Shared scroll container wraps both lists. Each quick link renders as a `.bm-row` (favicon + label + hover edit/delete) matching the tree's visual language; click navigates, middle-click opens new tab. Header shows a compact + button that reuses openAddModal, edit/delete reuse openEditModal/deleteLink. renderLinks() now also calls renderSidePanelQuickLinks() so main-panel and side-panel stay in sync on every state change. SVGs built via new svgFromString helper (DOMParser text/html) to avoid innerHTML on new code — commit: a592864 2026.04.15 15:05:01
```

- [x] DONE: On main page only include quick links section, all other bookmarks should be available from a bookmarks tab between notes and saved links in the other panel. it should be a more tradional tree folder layout with smaller icons but retain all the other functionality. main page is just quick links

```RESULT:
Added Bookmarks tab between Notes and Saved Links with full chrome.bookmarks tree (collapsible folders, per-node favicons, search, edit/delete actions, live refresh via chrome.bookmarks events, persisted collapse state in localStorage). Main page remains quick-links-only — commit: 999be66 2026-04-15 00:00:00
```

- [x] DONE: when saved links or quick links are updated create a markdown file in each with a user friendly list of links. for quick links organized by section, for saved links organized by tags

```RESULT:
Completed prior to todos workflow — commit: unknown unknown
```

## Fixes

- [x] FIX: can asana support checkboxes, if not can we make notes work where clicking the bullet adds strikethrough? and make sure the clear completed button works

```RESULT:
Confirmed Asana's html_notes allowlist has no checkbox markup (kept existing task-list UX locally instead of switching to strikethrough-bullet model). Fixed round-trip loss in asanaHtmlToMarkdown: detects <li> whose only content is a single <s> element and emits `- [x]` (and `- [ ]` for plain siblings when any li in the ul is struck). Clear Completed button now works after an Asana sync round-trip since `- [x]` lines survive — commit: f9ced69 2026.04.15 11:17:32
```

## Chores

- [x] CHORE: update readme and user guide as needed based on changes

```RESULT:
Refreshed README permissions table (bookmarks purpose reflects new side-panel use; added contextMenus + scripting rows) and in-app user guide: removed stale Quick Links Sections/Bookmark-sync/Export rows, added a Bookmarks help section describing the side-panel tree + folder controls + mirrored Quick Links + export, and replaced the ZenQuotes reference in Daily Focus with the manual curation flow — commit: 718543f 2026.04.15 20:05:49
```

- [x] CHORE: add insturctions on creating Asana PAT in settings

```RESULT:
Added a how-to block directly in Settings → Sync (above the PAT field) with a 4-step numbered list, direct link to app.asana.com/0/my-apps, and the Profile → My Settings → Apps → Manage Developer Apps fallback path. Uses the glass-panel styling already present in the settings panel so it reads as part of the section rather than a banner — commit: f4f8604 2026.04.15 20:06:32
```

- [x] CHORE: move Export button from main-panel quick-links header into the side-panel Bookmarks tab

```RESULT:
Moved #export-btn out of the main-panel quick-links header and into the side-panel Bookmarks #bm-tree-toolbar (next to the refresh button). Resized to 28×28 icon-only to match the toolbar's other controls; handler untouched since it's bound by id. Main-panel header now contains only the icon-view toggle and Add Link — commit: e70f7c7 2026.04.15 15:01:50
```

- [x] CHORE: strip multi-section UI from main-panel quick links — remove + Section button, section headers/rename/collapse, and the Bookmarks-sync button; consolidate all existing links into one flat list

```RESULT:
Main-panel quick links is now a single flat list. Removed + Section button, inline section headers (rename/collapse/delete), section dropdown in add/edit modal, Bookmarks-sync button/badge, and the auto-sync-on-load trigger. renderLinks + buildQuickLinksMarkdown simplified; fromBookmark links filtered out of view. bm-modal/openBmModal/applyBmSync/qlSections left as dead code for the follow-up task that repurposes folder management in the side-panel Bookmarks tab — commit: 9c5f68e 2026.04.15 14:59:09
```

- [x] CHORE: only show quicklinks on main panel

```RESULT:
Filtered `fromBookmark` sections out of renderLinks so main panel only renders user-defined quick-link sections. Bookmark-synced sections remain accessible via the side-panel Bookmarks tab (which reads chrome.bookmarks directly). No state or sync plumbing removed — commit: 2b3d1c0 2026.04.15 14:31:00
```

- [x] DONE: make sure tip tap is updated to function and is compatible with Asana editor as much as possible

```RESULT:
Pinned tiptap caret range to ^2.27.2 (latest tested 2.x; 3.x deferred as breaking major). Expanded markdown↔Asana HTML converter: fenced code blocks round-trip to `<pre><code>`, horizontal rules (`---`/`***`/`___`) emit `<hr/>`, inline `<u>` passes through html→md. Build verified — commit: 1cfca6d 2026-04-15 00:00:00
```

## Refactors

- [x] DONE: replace notes editor that is custom with tiptap, enable all the options so i can decide what to use, if it doesn't have the clear strikethrough / completed checkboxes, redo that. leave and update copy md, apple notes buttons

```RESULT:
Completed prior to todos workflow — commit: unknown unknown
```

- [x] DONE: update notes section to sync with Lumina folder in Obsidian instead of github / gist, update settings to include local rest api url and auth key

```RESULT:
Completed prior to todos workflow — commit: unknown unknown
```

- [x] DONE: Change integration from Obsidian to Asana, each note should sync with the notes in my tasks, update user guide with instructions on how to get your asana api key

```RESULT:
Replaced Obsidian Local REST API sync with Asana private-project task sync (PAT auth, auto-create Lumina Notes project, bidirectional markdown↔html_notes conversion, last-write-wins by modified_at, deletes complete tasks, local export buttons for links/settings). Updated manifest host_permissions, settings UI, setup wizard, help text, and README — commit: 70ae7aa 2026-04-15 00:00:00
```

- [x] DONE: replace zenqoutes integration with a fully manual daily focus section, come up with about 10 that you generate, inspirations should come from core12.com, fret12.com, and general digital marketing agency - be creative

```RESULT:
Removed zenquotes.io fetch button, CSS, handler, manifest host entry, and README row. Expanded DEFAULT_FOCUS_LINES to 10 original lines with core12/fret12/agency voice (strategy, rhythm, brand-as-repetition themes) — commit: aa42224 2026-04-15 00:00:00
```

- [x] DONE: come up with a few ideas on how to expand the Saved Links feature, want it to be a true reading list type feature, call it something more creative

```RESULT:
Renamed Saved Links → Kindling (reading list that's ready to ignite). Added per-item read/unread toggle (flame/check icon), Unread/Read/All status filter pills alongside tag filters, visual treatment for read items (muted + strikethrough), markdown export uses task-list checkboxes `- [x]`/`- [ ]`, updated notes button tooltip and help text. Other ideas considered but not shipped: per-item snooze-until, estimated reading time from URL, highlights/notes field, archive-after-N-days auto-sweep — commit: 5fe65b2 2026-04-15 00:00:00
```
