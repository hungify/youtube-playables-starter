# {{GAME_TITLE}}

A [YouTube Playable](https://developers.google.com/youtube/gaming/playables) built with Bun, Vite and strict TypeScript.

## Getting started

```bash
bun install                      # also enables the pre-commit hook
bunx playwright install chromium # once, for e2e tests
bun run dev                      # http://localhost:8080
```

To try the game in the YouTube SDK Test Suite, open https://developers.google.com/youtube/gaming/playables/test_suite and use `http://localhost:8080` as the Game URL.

## Commands

| Command                           | Description                                                    |
| --------------------------------- | -------------------------------------------------------------- |
| `bun run dev`                     | Dev server on http://localhost:8080 (`PORT=<port>` to change)  |
| `bun run build`                   | Production build into `dist/`                                  |
| `bun run format` / `format:check` | Format / verify formatting with oxfmt                          |
| `bun run lint`                    | Lint with oxlint                                               |
| `bun run typecheck`               | `tsc --noEmit`                                                 |
| `bun test`                        | Unit and compliance tests                                      |
| `bun run test:e2e`                | Playwright tests                                               |
| `bun run check`                   | format:check + lint + typecheck + test                         |
| `bun run validate`                | Static Playables checks on the built bundle                    |
| `bun run zip`                     | Release gate: check → build → validate → `playable-bundle.zip` |

## Agent skills

The skills in `.claude/skills/` come from [hungify/playables-skills](https://github.com/hungify/playables-skills) and are pinned in `skills-lock.json`.

```bash
bunx skills check    # is anything outdated?
bunx skills update   # update to the latest
```

Skills installed from that repo are overwritten by an update, so keep project-specific changes in separate skills.

## Certification rules in short

- Never use `localStorage`, `sessionStorage`, `indexedDB`; use `YouTubePlayables.loadData()` / `saveData()` (await `loadData()` before the first save).
- Never use the Page Visibility API; use `setOnPause()` / `setOnResume()`.
- Call `firstFrameReady()` when the first frame renders and `gameReady()` only when the game is interactive.
- Follow the host audio state (`isAudioEnabled()`, `setAudioChangeCallback()`).
- Relative asset paths only, clean file names, no external CDN requests (the SDK script in `index.html` is the one exception).

Architecture, conventions and AI tooling are described in `CLAUDE.md` and `.claude/rules/`. See `CONTRIBUTING.md` for the workflow.
