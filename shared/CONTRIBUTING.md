# Contributing

1. `bun install` (also enables the `.githooks/pre-commit` hook: format check, lint, typecheck, unit tests).
2. Branch from `main`, make focused changes.
3. Run `bun run check` while working and `bun run zip` before opening a PR. CI runs the same checks plus the Playwright suite.

## Code rules

- All dimensions, physics values, scene/asset/audio keys and scores live in `src/core/Constants.ts`.
- Game state goes through `gameState` and the typed `EventBus`, never engine objects (`this.registry`, `userData`) or the DOM.
- Remove listeners when their owner goes away (Phaser: in `this.events.once('shutdown', ...)`; three.js: call the `on()` unsubscribe and `dispose()` GPU resources).
- No `any`, no `!` non-null assertions. Pure logic belongs in `src/core/` with a test in `test/`.
- Pool frequently spawned objects; keep the JS heap well below 512 MB.

## Assets

Put static files in `public/assets`. Names must match `^[A-Za-z0-9_.-]+$`, paths must be relative.

## Editor setup

VS Code and Zed are configured to format on save with oxfmt (`.vscode/`, `.zed/`). Line endings are LF (`.gitattributes`, `.editorconfig`).
