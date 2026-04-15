# DONE

## Features

- [x] DONE: On main page only include quick links section, all other bookmarks should be available from a bookmarks tab between notes and saved links in the other panel. it should be a more tradional tree folder layout with smaller icons but retain all the other functionality. main page is just quick links

```FIX:
Added Bookmarks tab between Notes and Saved Links with full chrome.bookmarks tree (collapsible folders, per-node favicons, search, edit/delete actions, live refresh via chrome.bookmarks events, persisted collapse state in localStorage). Main page remains quick-links-only — commit: 999be66 2026-04-15 00:00:00
```

## Refactors

- [x] DONE: Change integration from Obsidian to Asana, each note should sync with the notes in my tasks, update user guide with instructions on how to get your asana api key

```FIX:
Replaced Obsidian Local REST API sync with Asana private-project task sync (PAT auth, auto-create Lumina Notes project, bidirectional markdown↔html_notes conversion, last-write-wins by modified_at, deletes complete tasks, local export buttons for links/settings). Updated manifest host_permissions, settings UI, setup wizard, help text, and README — commit: 70ae7aa 2026-04-15 00:00:00
```

- [x] DONE: replace zenqoutes integration with a fully manual daily focus section, come up with about 10 that you generate, inspirations should come from core12.com, fret12.com, and general digital marketing agency - be creative

```FIX:
Removed zenquotes.io fetch button, CSS, handler, manifest host entry, and README row. Expanded DEFAULT_FOCUS_LINES to 10 original lines with core12/fret12/agency voice (strategy, rhythm, brand-as-repetition themes) — commit: aa42224 2026-04-15 00:00:00
```

- [x] DONE: come up with a few ideas on how to expand the Saved Links feature, want it to be a true reading list type feature, call it something more creative

```FIX:
Renamed Saved Links → Kindling (reading list that's ready to ignite). Added per-item read/unread toggle (flame/check icon), Unread/Read/All status filter pills alongside tag filters, visual treatment for read items (muted + strikethrough), markdown export uses task-list checkboxes `- [x]`/`- [ ]`, updated notes button tooltip and help text. Other ideas considered but not shipped: per-item snooze-until, estimated reading time from URL, highlights/notes field, archive-after-N-days auto-sweep — commit: 5fe65b2 2026-04-15 00:00:00
```

## Chores

- [x] DONE: make sure tip tap is updated to function and is compatible with Asana editor as much as possible

```FIX:
Pinned tiptap caret range to ^2.27.2 (latest tested 2.x; 3.x deferred as breaking major). Expanded markdown↔Asana HTML converter: fenced code blocks round-trip to `<pre><code>`, horizontal rules (`---`/`***`/`___`) emit `<hr/>`, inline `<u>` passes through html→md. Build verified — commit: 1cfca6d 2026-04-15 00:00:00
```
