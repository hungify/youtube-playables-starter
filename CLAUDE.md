# CLAUDE.md — YouTube Playables Starter (maintainers)

This repository is the **starter** that creates YouTube Playables game projects; it is not a game.
`bun run create <dir> --template <phaser-2d|three-3d> [--example]` assembles a standalone project from:

1. `shared/` — copied into every project (SDK wrapper, validator, mock SDK, tests, configs, CI, `.claude/`).
2. `templates/<engine>/common/` — engine config (vite, tsconfig) and engine-only skills.
3. `templates/<engine>/<skeleton|example>/` — the game code. Its `STRUCTURE.md` is inlined into the project's `CLAUDE.md`.

`package.json` is merged from `shared/`, `templates/<engine>/` and the variant. `{{GAME_TITLE}}` / `{{PACKAGE_NAME}}` are replaced at creation.

## Rules

- **The generated project is the product.** Its conventions live in `shared/CLAUDE.md` and `shared/.claude/rules/` and apply to all code under `shared/` and `templates/`.
- Template code cannot be type-checked or tested in place (aliases and shared files only exist after creation). After any change under `shared/` or `templates/`, run `bun run verify <filter>`; run `bun run verify:e2e` before finishing.
- Keep skeletons minimal and engine-idiomatic; put larger showcases in `example/`.
- Shared code goes in `shared/` once, never copied into a template.
- `scripts/` (create, verify) is the only code type-checked at the root.

## Commands

```bash
bun run check                  # format:check + lint (shared, templates, scripts) + typecheck scripts
bun run create <dir> --template <t> [--example] [--title "Name"] [--no-git]
bun run verify [filter]        # create each variant in a temp dir, bun install, bun run zip
bun run verify:e2e [filter]    # + Playwright, ports 8090+
```
