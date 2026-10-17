# CLAUDE.md — {{GAME_TITLE}}

**{{GAME_TITLE}}** is a YouTube Playable built from the team HTML5 game starter:
**Bun + Vite + Strict TypeScript 7 + Oxlint + Oxfmt + Playwright + automated Playables certification**.

## 1. Directory Organization (Mandatory Conventions)

<!-- TEMPLATE_STRUCTURE -->

### Shared starter code (keep the contracts, adapt freely)

```
src/sdk/YouTubePlayables.ts    # Hardened Playables SDK controller (boot order, save guard, UTF-16 sanitizer, ads)
src/types/ytgame.d.ts          # Official Google YouTube Playables SDK v1 types
src/lib/TypedEventBus.ts       # Typed pub/sub; src/core/EventBus.ts declares this game's events
src/lib/Haptics.ts             # Guarded Vibration API wrapper
scripts/validate-playable.ts   # Bundle audit + forbidden source APIs + zip (bun run validate / zip)
e2e/playables.ts               # Mock ytgame SDK and snapshot helpers for Playwright
test/sdk, test/lib, test/build # Certification invariants for the code above
```

Use the path aliases from `tsconfig.json` / `vite.config.ts` (`@core/*`, `@sdk/*`, `@lib/*`, ...) instead of deep relative `../../` imports.

## 2. Coding Style & Architectural Rules

1. **Zero Magic Numbers / Strings (`src/core/Constants.ts`)**: every dimension, physics value, threshold, score value, scene/screen key, asset/audio key, DOM id and UI string lives there.
2. **Centralized `gameState` + Typed `EventBus`**: the presentation layer reads `gameState` and mutates it only through its methods, which emit typed events. Never keep game state in engine objects (Phaser `this.registry`, three.js `userData`) or the DOM.
3. **Humble View**: `src/core/` imports nothing from the engine or the DOM, so `bun test` runs in milliseconds.
4. **Listener cleanup**: anything that subscribes (`EventBus.on`, resize, input) unsubscribes when its owner goes away; see the engine notes above.
5. **Formatting & Linting (`oxfmt` + `oxlint` + `tsc`)**:
    - 4-space indentation, single quotes, no trailing commas, `printWidth: 100` (`.oxfmtrc.json` & `.editorconfig`).
    - Zero `any`, zero `!` non-null assertions, `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`.
    - Browser storage (`localStorage`, `sessionStorage`, `indexedDB`) and the Page Visibility API (`visibilitychange`, `document.hidden`) are blocked by both `oxlint` and `scripts/validate-playable.ts`.

## 3. Installed AI Ecosystem (`.claude/`)

- **Agents (`.claude/agents/`)**: `playable-publisher`, `game-creator`, `game-reviewer`, `game-qa-runner`
- **Rulesets (`.claude/rules/`)**: `01-youtube-playables-certification`, `02-typescript-strict-architecture`, `03-testing-and-qa`
- **Skills (`.claude/skills/`)**: game studio skills, multi-portal SDK & compliance skills, plus the engine skills listed above.

## 4. Standard Commands (Bun)

```bash
bun run dev          # Vite dev server on http://localhost:8080 (PORT=<port> to change)
bun run format       # Format with oxfmt
bun run format:check # Verify formatting
bun run lint         # oxlint
bun run typecheck    # tsc --noEmit
bun test             # Unit & compliance tests (test/)
bun run check        # format:check + lint + typecheck + test
bun run build        # Production build into dist/
bun run validate     # Static Playables checks on dist/
bun run zip          # Release gate: check -> build -> validate -> playable-bundle.zip
bun run test:e2e     # Playwright (bunx playwright install chromium once)
```

`validate` accepts `--allow-url <url>` for inert URLs the engine embeds in its code; the engine's
ones are already in the `validate` script. Add new ones only after checking they are not requests.
