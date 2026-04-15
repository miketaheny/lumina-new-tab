# TODO

- [x] DONE: replace notes editor that is custom with tiptap, enable all the options so i can decide what to use, if it doesn't have the clear strikethrough / completed checkboxes, redo that. leave and update copy md, apple notes buttons

- [x] DONE: update notes section to sync with Lumina folder in Obsidian instead of github / gist, update settings to include local rest api url and auth key

- [x] DONE: when saved links or quick links are updated create a markdown file in each with a user friendly list of links. for quick links organized by section, for saved links organized by tags

- [x] REFACTOR: Change integration from Obsidian to Asana, each note should sync with the notes in my tasks, update user guide with instructions on how to get your asana api key

```FIX:
Replaced Obsidian Local REST API sync with Asana private-project task sync (PAT auth, auto-create Lumina Notes project, bidirectional markdown↔html_notes conversion, last-write-wins by modified_at, deletes complete tasks, local export buttons for links/settings). Updated manifest host_permissions, settings UI, setup wizard, help text, and README — commit: 70ae7aa 2026-04-15 00:00:00
```

- [ ] FEAT: On main page only include quick links section, all other bookmarks should be available from a bookmarks tab between notes and saved links in the other panel. it should be a more tradional tree folder layout with smaller icons but retain all the other functionality. main page is just quick links

- [ ] REFACTOR: replace zenqoutes integration with a fully manual daily focus section, come up with about 10 that you generate, inspirations should come from core12.com, fret12.com, and general digital marketing agency - be creative

- [ ] REFACTOR: come up with a few ideas on how to expand the Saved Links feature, want it to be a true reading list type feature, call it something more creative

- [ ] CHORE: make sure tip tap is updated to function and is compatible with Asana editor as much as possible