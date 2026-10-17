---
description: Strict TypeScript & Humble View Game Architecture Rules
globs: ['src/**/*.ts', 'test/**/*.ts']
---

# Strict TypeScript & Humble View Architecture

1. **Zero `any` & Zero `!` Assertions**: Enforced by `oxlint` and `tsconfig.json` (`strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`, `noImplicitOverride: true`).
2. **Humble View Pattern (`src/core/` vs `src/scenes/`)**:
    - **`src/core/`**: Pure TypeScript game rules, scoring, economy, state transitions, and constants (`Constants.ts`, `ScoringRules.ts`). MUST have **zero engine (Phaser / three.js) or DOM imports** so `bun test` executes in milliseconds.
    - **Presentation layer** (Phaser: `src/scenes/`, `src/objects/`, `src/ui/`; three.js: `src/render/`, `src/input/`, `src/audio/`, `src/ui/`). Reads `src/core/` constants/rules, renders sprites/tweens/particles, plays audio, and forwards user input.
3. **Centralized Constants (`src/core/Constants.ts`)**: Never hardcode magic numbers (dimensions, physics gravity, stage thresholds, point values, asset keys) inside scenes.
4. **Memory & GC Discipline**: Peak JS heap MUST stay well below 512 MB (iOS YouTube WebView limit). Pre-allocate and pool frequently spawned objects instead of `new` / `destroy()` inside `update()`; in three.js reuse scratch `Vector3`/`Quaternion` objects and `dispose()` geometries, materials and textures you stop using.
