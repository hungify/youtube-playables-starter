/**
 * Every tuning value, key and string of the game. World coordinates are game pixels with the
 * origin at the arena centre; every scene centres its camera on (0, 0).
 */

export const SCENE_KEYS = Object.freeze({
    BOOT: 'Boot',
    PRELOADER: 'Preloader',
    MAIN_MENU: 'MainMenu',
    GAME: 'Game',
    GAME_OVER: 'GameOver'
} as const);

export const GAME_CONFIG = Object.freeze({
    /** Design area that is always visible; Scale.EXPAND adds space around it on other ratios. */
    WIDTH: 820,
    HEIGHT: 1180,
    LOAD_DATA_TIMEOUT_MS: 2000,
    /** Longest simulated step, so a hitch or a resume never tunnels the player through a coin. */
    MAX_FRAME_MS: 50
});

export const AUDIO_KEYS = Object.freeze({
    PICKUP: 'pickup',
    GAME_OVER: 'gameOver'
});

export const ASSET_PATHS = Object.freeze({
    ROOT: 'assets/',
    PICKUP: 'fx/pickup.wav',
    GAME_OVER: 'fx/crash.wav'
});

export const ARENA = Object.freeze({
    RADIUS: 360,
    BORDER: 8
});

export const PLAYER = Object.freeze({
    RADIUS: 28,
    /** px/s² at full input. */
    ACCEL: 1800,
    /** Exponential velocity damping per second. */
    DRAG: 1.6,
    MAX_SPEED: 640,
    /** Share of the radial speed kept when bouncing off the rim. */
    BOUNCE: 0.6
});

export const COIN = Object.freeze({
    RADIUS: 20,
    MIN_SPAWN_DISTANCE: 180,
    EDGE_MARGIN: 50,
    SPAWN_ATTEMPTS: 12,
    PULSE_SCALE: 1.2,
    PULSE_MS: 400
});

export const ROUND = Object.freeze({
    DURATION_MS: 20_000,
    COIN_TIME_BONUS_MS: 1500,
    MAX_TIME_MS: 30_000,
    COIN_POINTS: 10,
    /** Collect the next coin within this window to grow the combo multiplier. */
    COMBO_WINDOW_MS: 2500,
    MAX_COMBO: 5
});

export const INPUT = Object.freeze({
    /** Pointer distance from the player, in game px, below which the player coasts. */
    DEADZONE_PX: 16,
    /** Pointer distance that means full tilt. */
    FULL_TILT_PX: 160,
    /** Phaser key codes for the second set of movement keys (arrows come from createCursorKeys). */
    WASD: { left: 'A', right: 'D', up: 'W', down: 'S' }
});

export const COLORS = Object.freeze({
    BACKGROUND: '#1b1033',
    ARENA: 0x2d6a8f,
    BORDER: 0x8fd3ff,
    PLAYER: 0xffc857,
    COIN: 0x5cf2b2,
    BUTTON: 0xffc857,
    LOADING: 0xffffff,
    TEXT: '#ffffff',
    ACCENT: '#ffc857',
    COMBO: '#5cf2b2',
    BUTTON_TEXT: '#1b1033'
});

export const LAYOUT = Object.freeze({
    FONT: '"Arial Black", Arial, sans-serif',
    TITLE_SIZE: 76,
    BODY_SIZE: 36,
    HINT_SIZE: 24,
    HUD_SIZE: 40,
    /** HUD inset from the edge of the design area. */
    HUD_MARGIN: 40,
    TITLE_Y: -260,
    SUBTITLE_Y: -150,
    BUTTON_Y: 120,
    HINT_Y: 260,
    /** Buttons stay well above the 48dp touch minimum even when the design area is scaled down. */
    BUTTON_WIDTH: 360,
    BUTTON_HEIGHT: 120,
    LOADING_BAR_WIDTH: 420,
    LOADING_BAR_HEIGHT: 28,
    LOADING_BORDER: 3,
    LOADING_PAD: 6
});

export const TEXT = Object.freeze({
    TITLE: '{{GAME_TITLE}}',
    HINT: 'Hold and drag, or use the arrow keys / WASD',
    PLAY: 'Play',
    PLAY_AGAIN: 'Play again',
    BEST: 'Best',
    SCORE: 'Score',
    TIME_UP: 'Time up!',
    NEW_BEST: 'New best!',
    COMBO_PREFIX: 'x',
    SECONDS_SUFFIX: 's',
    PAUSED: 'PAUSED'
});
