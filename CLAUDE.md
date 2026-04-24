# Lumina — New Tab

Personal Chrome extension that replaces the new tab page with a productivity dashboard: AI search, quick links, rich-text notes, reading list, weather, and animated backgrounds.

## Stack

- **v1** — vanilla JS Chrome extension (Manifest V3, actively maintained, separate concept from v2)
- **v2** — Turborepo monorepo, TypeScript, React 19
  - `v2/apps/extension` — WXT-based Chrome extension
  - `v2/apps/web` — Next.js 15 web app (Playwright for e2e)
  - `v2/packages/core` — shared logic
  - `v2/packages/drive` — Google Drive integration
  - `v2/packages/ui` — shared UI components

## File conventions

- v1 and v2 are independent codebases in the same repo — changes to one don't affect the other
- v2 uses npm workspaces via Turborepo; run commands from `v2/` root
- Component per file in v2 packages

## Verification commands

Run from `v2/`:

```
npm run typecheck
npm run build
```

## Commit / branch conventions

See global `~/.claude/CLAUDE.md` for the full branch model (`main` / `staging` / `development`).

## Stop-and-ask triggers

- Google API credentials or OAuth client secrets
- Chrome Web Store manifest changes that affect permissions
