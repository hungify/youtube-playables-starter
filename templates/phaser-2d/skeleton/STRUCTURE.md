Engine: **Phaser 3.90** (2D). Created from the `phaser-2d` **skeleton**: a minimal complete loop
(menu → play → score → time up → game over → save best → play again) as a tiny game: steer a
ball around an arena and grab coins before time runs out. Replace the gameplay, keep the boot
sequence and the `src/core` / presentation split.

```
src/
├── core/                      # Pure TypeScript (ZERO Phaser/DOM imports -> 1ms unit tests)
│   ├── Constants.ts           # Scene/audio keys, arena/player/coin/round tuning, colors, layout, text
│   ├── EventBus.ts            # This game's events on TypedEventBus (score, coin, game start/over)
│   ├── GameState.ts           # Singleton state: startRun(), tick(), endRun(), hydrate(), toSaveData()
│   ├── CollectRules.ts        # Player movement + rim bounce, coin placement, combo, time bonus
│   └── SaveData.ts            # GameSaveData shape
├── scenes/
│   ├── Boot.ts                # Pause/resume + host mute wiring, loads the cloud save
│   ├── Preloader.ts           # Progress bar, calls firstFrameReady(), loads audio
│   ├── MainMenu.ts            # Title, best score, Play; calls gameReady() when interactive
│   ├── Game.ts                # Arena, player, coin, HUD; forwards keys/pointer to gameState.tick()
│   └── GameOver.ts            # Result, sendScore(), saveData(), Play again
├── ui/
│   ├── centerCamera.ts        # Keeps the world origin centred under Scale.EXPAND (resize-safe)
│   └── Button.ts              # Call-to-action button (pointer + Enter/Space) and centred labels
├── config.ts                  # Phaser.Types.Core.GameConfig
└── main.ts                    # Entrypoint + window.render_game_to_text() + window.advanceTime(ms)
test/core/                     # CollectRules + GameState unit tests
e2e/                           # Boot order, coin collection, time-up + cloud save, resize, heap (CoinChaser bot)
public/assets/fx/              # pickup.wav, crash.wav
```

Phaser notes:

- Never store state in `this.registry`; use `gameState`.
- Every scene that registers `EventBus`, `scale.on('resize')` or `input.on()` listeners removes them in `this.events.once('shutdown', ...)` (see `centerCamera` and `addButton`).
- Pool frequently spawned objects instead of creating them in `update()`.
- Layout around the world origin inside the 820x1180 design area; it is always visible.
- `.claude/skills/` includes the Phaser skills. They are written for Phaser 4; check API differences against Phaser 3.90.
- Want a bigger reference? Create a project with `--example` from the starter to get Zombie Rush.
