# TODO

- [x] CHORE: strip multi-section UI from main-panel quick links — remove + Section button, section headers/rename/collapse, and the Bookmarks-sync button; consolidate all existing links into one flat list

```FIX:
Main-panel quick links is now a single flat list. Removed + Section button, inline section headers (rename/collapse/delete), section dropdown in add/edit modal, Bookmarks-sync button/badge, and the auto-sync-on-load trigger. renderLinks + buildQuickLinksMarkdown simplified; fromBookmark links filtered out of view. bm-modal/openBmModal/applyBmSync/qlSections left as dead code for the follow-up task that repurposes folder management in the side-panel Bookmarks tab — commit: 9c5f68e 2026.04.15 14:59:09
```

- [ ] CHORE: move Export button from main-panel quick-links header into the side-panel Bookmarks tab

- [ ] FEAT: render Quick Links inside the side-panel Bookmarks tab (above the chrome bookmarks tree)

- [ ] FEAT: in side-panel Bookmarks tab, add controls to create, rename, and remove chrome bookmark folders (replacing the old main-panel section add/rename/remove controls)

- [x] FIX: can asana support checkboxes, if not can we make notes work where clicking the bullet adds strikethrough? and make sure the clear completed button works

```FIX:
Confirmed Asana's html_notes allowlist has no checkbox markup (kept existing task-list UX locally instead of switching to strikethrough-bullet model). Fixed round-trip loss in asanaHtmlToMarkdown: detects <li> whose only content is a single <s> element and emits `- [x]` (and `- [ ]` for plain siblings when any li in the ul is struck). Clear Completed button now works after an Asana sync round-trip since `- [x]` lines survive — commit: f9ced69 2026.04.15 11:17:32
```

- [x] DONE: replace notes editor that is custom with tiptap, enable all the options so i can decide what to use, if it doesn't have the clear strikethrough / completed checkboxes, redo that. leave and update copy md, apple notes buttons

- [x] DONE: update notes section to sync with Lumina folder in Obsidian instead of github / gist, update settings to include local rest api url and auth key

- [x] DONE: when saved links or quick links are updated create a markdown file in each with a user friendly list of links. for quick links organized by section, for saved links organized by tags

- [x] CHORE: only show quicklinks on main panel

```FIX:
Filtered `fromBookmark` sections out of renderLinks so main panel only renders user-defined quick-link sections. Bookmark-synced sections remain accessible via the side-panel Bookmarks tab (which reads chrome.bookmarks directly). No state or sync plumbing removed — commit: 2b3d1c0 2026.04.15 14:31:00
```