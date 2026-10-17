# Contributing to the starter

1. `bun install` (enables the pre-commit hook: format check, lint, typecheck of `scripts/`).
2. Branch from `main`, make focused changes.
3. Run `bun run verify` after changing anything in `shared/` or `templates/`, and `bun run verify:e2e` before opening a PR. CI runs both.

## Where changes go

- **Every game needs it** (SDK wrapper, validator, mock SDK, configs, CI, `.claude` rules): `shared/`. Add or update a test in `shared/test/`.
- **One engine needs it** (Vite aliases, engine dependencies, engine skills): `templates/<engine>/common/` or `templates/<engine>/package.json`.
- **Game code** (scenes, rendering, rules): the variant folder. Keep skeletons small; they are what every new game starts from.
- A new variant or engine needs a `STRUCTURE.md` and must pass `bun run verify:e2e`.

## Rules for template code

Generated projects follow their own `CLAUDE.md` and `.claude/rules/` (in `shared/`): constants in `src/core/Constants.ts`, state through `gameState` and the typed `EventBus`, pure `src/core`, no `any` or `!`, no browser storage or Page Visibility API, listener cleanup, pooled objects. Placeholders: `{{GAME_TITLE}}`, `{{PACKAGE_NAME}}`.

## Editor setup

VS Code and Zed format on save with oxfmt (`.vscode/`, `.zed/`). Line endings are LF.
