# Lumina — New Tab

Personal Chrome extension that replaces the new tab page with a productivity dashboard: AI search, quick links, rich-text notes, reading list, weather, and animated backgrounds.

## Stack

- **extension** — vanilla JS Chrome extension (Manifest V3, actively maintained)
- **web** — Turborepo monorepo, TypeScript, React 19
  - `web/apps/web` — Next.js 15 web app (Playwright for e2e)
  - `web/packages/core` — shared logic
  - `web/packages/drive` — Google Drive integration
  - `web/packages/ui` — shared UI components

## File conventions

- `extension/` and `web/` are independent codebases in the same repo — changes to one don't affect the other
- `web/` uses npm workspaces via Turborepo; run commands from `web/` root
- Component per file in `web/` packages

## Verification commands

Run from `web/`:

```
npm run typecheck
npm run build
```

## Commit / branch conventions

See global `~/.claude/CLAUDE.md` for the full branch model (`main` / `staging` / `development`).

## Stop-and-ask triggers

- Google API credentials or OAuth client secrets
- Chrome Web Store manifest changes that affect permissions
