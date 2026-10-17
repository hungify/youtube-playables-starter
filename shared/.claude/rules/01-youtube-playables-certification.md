---
description: Mandatory YouTube Playables & Multi-Portal Certification Rules
globs: ['src/**/*', 'index.html', 'vite/**/*']
---

# YouTube Playables Certification Rules (MUST NOT Violate)

1. **No Browser Storage (`Rule #4`)**: NEVER use `localStorage`, `sessionStorage`, or `indexedDB` for game progress. Always use `YouTubePlayables.loadData()` and `YouTubePlayables.saveData()`. Always `await loadData()` before the first `saveData()`.
2. **No Page Visibility API (`Rule #6`)**: NEVER use `document.addEventListener('visibilitychange', ...)` or `document.hidden`. Always use `YouTubePlayables.setOnPause()` and `YouTubePlayables.setOnResume()`.
3. **Strict Boot Sequence (`Rule #1 & #2`)**:
    - Load `<script src="https://www.youtube.com/game_api/v1"></script>` before any game script in `index.html`.
    - Call `YouTubePlayables.firstFrameReady()` when the preloader/splash frame renders.
    - Call `YouTubePlayables.gameReady()` ONLY when the screen is interactive.
4. **Audio Slave to Host (`Rule #5`)**: Initialize mute state from `YouTubePlayables.isAudioEnabled()` and subscribe via `YouTubePlayables.setAudioChangeCallback()`. Never play audio when YouTube has muted the game.
5. **Relative Paths & Clean Filenames (`Rule #8 & #9`)**: All asset paths MUST be relative (`./` or `assets/...`). All asset filenames MUST match `^[A-Za-z0-9_.-]+$`. No external CDN scripts/fonts/requests.
