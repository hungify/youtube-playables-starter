---
description: Testing Trophy & QA Verification Rules for Games
globs: ['test/**/*.ts', 'src/**/*.ts', 'scripts/**/*.ts']
---

# Game Testing & Verification Strategy

1. **Unit Tests (`bun test`)**:
    - Every pure rule module in `src/core/` MUST have unit tests in `test/`.
    - SDK lifecycle & certification invariants in `src/sdk/YouTubePlayables.ts` MUST be tested in `test/sdk/YouTubePlayables.test.ts`.
2. **AI & Automated QA Hook (`window.render_game_to_text`)**:
    - `src/main.ts` exposes `window.render_game_to_text()` returning a concise JSON snapshot of active scenes, score, player position, `started`/`gameOver`, the SDK `firstFrameReady`/`gameReady` flags and game-specific state so AI agents and Playwright tests can inspect game state deterministically without pixel guessing.
3. **Pre-Release Gate (`bun run zip`)**:
    - Always run `bun run zip` (which runs `oxlint` → `tsc --noEmit` → `bun test` → `vite build` → `scripts/validate-playable.ts --zip`) before considering any change complete.

4. **E2E (`bun run test:e2e`)**: Playwright specs in `e2e/` drive the real game through `render_game_to_text()` (bot in `e2e/helpers.ts`) and the mock `ytgame` SDK in `e2e/playables.ts`. Run them before releases; keep coverage of boot order, gameplay, restart safety, resize, heap size and cloud saves as the game grows. Use `PORT=<port>` when 8080 is busy.
5. **Store assets**: keep Developer Portal thumbnails in `store/` (not bundled) and regenerate them after visual changes.
