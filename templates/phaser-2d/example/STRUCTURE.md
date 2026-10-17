Engine: **Phaser 3.90** (2D). Created from the `phaser-2d` **example** (Zombie Rush: a free-roam
arena where you drive a car, ram zombie waves, blow up barrels and survive bosses).

```
src/
├── core/                      # Pure TypeScript (ZERO Phaser/DOM imports -> 1ms unit tests)
│   ├── Constants.ts           # ALL config values, Scene/Asset/Audio keys, physics & stage tuning
│   ├── EventBus.ts            # This game's events on TypedEventBus (domain:action + spectacle:*)
│   ├── GameState.ts           # Centralized singleton state with resetSession(), hydrate(), toSaveData()
│   ├── ArenaRules.ts          # Vehicle model, map generation, collisions, zombie AI/waves, scoring, car unlocks
│   ├── Upgrades.ts            # Upgrade costs, derived car stats, scrap rewards, save sanitizing
│   └── SaveData.ts            # GameSaveData shape (pure, so core never imports the SDK wrapper)
├── objects/ArenaTextures.ts   # Paints every gameplay texture in code (no extra image files)
├── ui/                        # GridSnap, Touch (48dp targets), Layout (centered 820x1180 design frame)
├── scenes/                    # Boot, Preloader (firstFrameReady), MainMenu (gameReady), Game, GameOver, UI (HUD + radar)
├── config.ts                  # Phaser.Types.Core.GameConfig
└── main.ts                    # Entrypoint + window.render_game_to_text() + window.advanceTime(ms)
test/core/                     # ArenaRules, GameState, Upgrades unit tests
e2e/                           # Boot, gameplay invariants, progression/ads/haptics (ZombieHunter bot in helpers.ts)
scripts/                       # capture-thumbnails.ts (bun run thumbnails), generate-audio.ts (bun run audio)
store/                         # Store listing + gameplay thumbnails for the Developer Portal (not bundled)
```

Phaser notes:

- Never store state in `this.registry`; use `gameState`.
- Every scene that registers `EventBus`, `scale.on('resize')` or `input.on()` listeners removes them in `this.events.once('shutdown', ...)`.
- Pool frequently spawned objects (the `Zombie[]` pool in `Game.ts`).
- `.claude/skills/` includes the Phaser skills. They are written for Phaser 4; check API differences against Phaser 3.90.
