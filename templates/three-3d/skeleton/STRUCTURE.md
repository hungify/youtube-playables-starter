Engine: **three.js** (3D). Created from the `three-3d` **skeleton**: a minimal complete loop
(menu → play → score → time up → game over → save best → play again) as a small game, Gem Drift:
roll an orb around a floating arena and grab gems before time runs out. Replace the gameplay,
keep the boot sequence and the `src/core` / presentation split.

```
src/
├── core/                      # Pure TypeScript (ZERO three.js/DOM imports -> 1ms unit tests)
│   ├── Constants.ts           # Screens, DOM ids, arena/orb/gem/round tuning, camera, colors, audio, text
│   ├── EventBus.ts            # This game's events on TypedEventBus (screen, score, gem, game start/over)
│   ├── GameState.ts           # Singleton state: startRun(), tick(), endRun(), hydrate(), toSaveData()
│   ├── DriftRules.ts          # Orb movement + rim bounce, gem placement, combo, time bonus
│   └── SaveData.ts            # GameSaveData shape
├── render/World.ts            # three.js renderer, lights, arena, orb, gem, follow camera, resize
├── input/Input.ts             # Keyboard (arrows/WASD) + hold-and-drag → direction on the XZ plane
├── audio/Sfx.ts               # Web Audio synth slaved to the host mute state
├── ui/Hud.ts                  # DOM overlay: HUD, menu, game over (native buttons, 48dp)
└── main.ts                    # Boot sequence, frame loop, pause/resume, window.render_game_to_text()
test/core/                     # DriftRules + GameState unit tests
e2e/                           # Boot order, gem collection, time-up + cloud save, resize, heap (GemChaser bot)
```

three.js notes:

- three.js is a renderer only. Add physics (e.g. `@dimforge/rapier3d-compat`) or `GLTFLoader` per game and watch `bun run validate`'s size report.
- Objects created once per page (World, Input, Hud) keep their listeners. Anything created per run unsubscribes (the `EventBus.on` return value) and calls `dispose()` on geometries, materials and textures.
- Reuse scratch `Vector3`/`Quaternion` objects in frame code; never allocate inside the loop.
- `firstFrameReady()` right after the first `renderer.render()`, `gameReady()` once the menu accepts input.
