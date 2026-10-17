# YouTube Playables Starter

The team starter for [YouTube Playables](https://developers.google.com/youtube/gaming/playables) games. One command creates a **standalone game project**, 2D (Phaser) or 3D (three.js), with everything a Playable needs already wired and tested:

- Hardened SDK wrapper: boot order (`firstFrameReady` → `gameReady`), load-before-save guard, UTF-16 sanitizer, pause/resume, host audio, ads.
- Certification checks: oxlint rules plus a bundle validator (SDK first, relative paths, file names, no external URLs, size budget) and `bun run zip` as the release gate.
- Strict TypeScript, pure `src/core` game rules with unit tests, Playwright e2e against a mock SDK, a `render_game_to_text()` QA hook.
- CI, pre-commit hook, editor config, and the `.claude/` setup (agents, rules, skills) for AI-assisted development.

## Create a game

```bash
git clone https://github.com/hungify/youtube-playables-starter.git
cd youtube-playables-starter
bun install

bun run create ../space-golf --template three-3d --title "Space Golf"
cd ../space-golf
bun install
bun run dev
```

| Option | Description |
|--------|-------------|
| `--template phaser-2d` | 2D with Phaser 3.90: scenes, tweens, particles, arcade physics built in |
| `--template three-3d` | 3D with three.js: renderer + a small game loop, input, DOM UI (add physics/loaders per game) |
| `--example` | Start from the full sample game instead of the skeleton (`phaser-2d`: Zombie Rush) |
| `--title "Name"` | Game title (defaults to the folder name) |
| `--no-git` | Skip `git init` |

The skeleton is a minimal complete loop (menu → play → score → time up → game over → save best → play again). Replace the gameplay, keep the boot sequence and the `src/core` / presentation split. The new project has no link back to this repository; its `README.md` and `CLAUDE.md` describe how to work in it.

## What is in this repository

```
shared/                 Copied into every project: src/sdk, src/lib, src/types, scripts/validate-playable.ts,
                        e2e/playables.ts, test/{sdk,lib,build}, configs, CI, .claude (agents, rules, skills)
templates/
├── phaser-2d/
│   ├── package.json    Engine dependencies and scripts, merged over shared/package.json
│   ├── common/         vite.config.ts, tsconfig.json, Phaser skills
│   ├── skeleton/       Default project content (src, test, e2e, public, index.html)
│   └── example/        Zombie Rush (--example)
└── three-3d/
    ├── package.json
    ├── common/
    └── skeleton/
scripts/
├── create.ts           bun run create
└── verify.ts           Generates every variant and runs its release gate
```

Each `skeleton/` and `example/` has a `STRUCTURE.md` that is inlined into the generated `CLAUDE.md`. `{{GAME_TITLE}}` and `{{PACKAGE_NAME}}` are replaced at creation.

## Working on the starter

| Command | Description |
|---------|-------------|
| `bun run check` | format:check + lint over `shared/`, `templates/`, `scripts/` + typecheck of `scripts/` |
| `bun run verify [filter]` | Create each variant in a temp folder, `bun install`, `bun run zip` |
| `bun run verify:e2e [filter]` | Same, plus Playwright (ports 8090+) |

Template code is only type-checked and tested inside a generated project, so run `bun run verify` (and `verify:e2e` before merging) after every template change. To try a change by hand, `bun run create` into a scratch folder and run it there. See `CONTRIBUTING.md`.

## License

MIT. The Phaser example is based on the Phaser Studio template; the Phaser logo and characters are © Phaser Studio Inc.
