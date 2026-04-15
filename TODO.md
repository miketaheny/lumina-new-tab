# TODO

- [x] FIX: can asana support checkboxes, if not can we make notes work where clicking the bullet adds strikethrough? and make sure the clear completed button works

```FIX:
Confirmed Asana's html_notes allowlist has no checkbox markup (kept existing task-list UX locally instead of switching to strikethrough-bullet model). Fixed round-trip loss in asanaHtmlToMarkdown: detects <li> whose only content is a single <s> element and emits `- [x]` (and `- [ ]` for plain siblings when any li in the ul is struck). Clear Completed button now works after an Asana sync round-trip since `- [x]` lines survive — commit: f9ced69 2026.04.15 11:17:32
```

- [x] DONE: replace notes editor that is custom with tiptap, enable all the options so i can decide what to use, if it doesn't have the clear strikethrough / completed checkboxes, redo that. leave and update copy md, apple notes buttons

- [x] DONE: update notes section to sync with Lumina folder in Obsidian instead of github / gist, update settings to include local rest api url and auth key

- [x] DONE: when saved links or quick links are updated create a markdown file in each with a user friendly list of links. for quick links organized by section, for saved links organized by tags
