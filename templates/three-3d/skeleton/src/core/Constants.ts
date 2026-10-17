/** Every tuning value, key and string of the 3D template. World units are metres on the XZ plane. */

export const SCREENS = Object.freeze({
    BOOT: 'Boot',
    MENU: 'Menu',
    GAME: 'Game',
    GAME_OVER: 'GameOver'
} as const);

export type ScreenName = (typeof SCREENS)[keyof typeof SCREENS];

export const GAME_CONFIG = Object.freeze({
    LOAD_DATA_TIMEOUT_MS: 2000,
    /** Longest simulated step, so a hitch never tunnels the orb through a gem or the rim. */
    MAX_FRAME_MS: 50,
    /** Caps the backing-store resolution on high-DPI phones to protect fill rate and memory. */
    MAX_PIXEL_RATIO: 2
});

export const DOM_IDS = Object.freeze({
    PARENT: 'gameParent',
    HUD: 'hud',
    SCORE: 'score',
    TIMER: 'timer',
    COMBO: 'combo',
    MENU: 'menu',
    MENU_TITLE: 'menuTitle',
    MENU_BEST: 'menuBest',
    MENU_HINT: 'menuHint',
    PLAY: 'playButton',
    GAME_OVER: 'gameOver',
    GAME_OVER_TITLE: 'gameOverTitle',
    GAME_OVER_SCORE: 'gameOverScore',
    GAME_OVER_BEST: 'gameOverBest',
    PLAY_AGAIN: 'playAgainButton',
    PAUSED: 'paused'
});

export const ARENA = Object.freeze({
    RADIUS: 10,
    THICKNESS: 0.6,
    RIM_TUBE: 0.18,
    RIM_SEGMENTS: 8,
    SEGMENTS: 64
});

export const ORB = Object.freeze({
    RADIUS: 0.6,
    /** Icosahedron subdivision; low and flat-shaded so the rolling is easy to read. */
    DETAIL: 1,
    ACCEL: 28,
    /** Exponential velocity damping per second. */
    DRAG: 1.6,
    MAX_SPEED: 11,
    /** Share of the radial speed kept when bouncing off the rim. */
    BOUNCE: 0.6,
    POP_MS: 160,
    POP_SCALE: 0.25
});

export const GEM = Object.freeze({
    RADIUS: 0.45,
    FLOAT_HEIGHT: 0.9,
    MIN_SPAWN_DISTANCE: 4,
    EDGE_MARGIN: 1.2,
    SPAWN_ATTEMPTS: 12,
    SPIN_RAD_PER_S: 2.4,
    BOB_HEIGHT: 0.2,
    BOB_RAD_PER_S: 3
});

export const ROUND = Object.freeze({
    DURATION_MS: 20_000,
    GEM_TIME_BONUS_MS: 1500,
    MAX_TIME_MS: 30_000,
    GEM_POINTS: 10,
    /** Collect the next gem within this window to grow the combo multiplier. */
    COMBO_WINDOW_MS: 2500,
    MAX_COMBO: 5
});

export const INPUT = Object.freeze({
    /** Pointer distance from the screen centre, in CSS px, below which the orb coasts. */
    DEADZONE_PX: 12,
    /** Pointer distance that means full tilt. */
    FULL_TILT_PX: 120,
    KEYS_LEFT: ['ArrowLeft', 'KeyA'],
    KEYS_RIGHT: ['ArrowRight', 'KeyD'],
    KEYS_UP: ['ArrowUp', 'KeyW'],
    KEYS_DOWN: ['ArrowDown', 'KeyS']
});

export const CAMERA = Object.freeze({
    FOV: 50,
    /** Portrait screens widen the vertical FOV so the arena still fits sideways. */
    MAX_FOV: 80,
    HEIGHT: 14,
    DISTANCE: 12,
    FOLLOW_RATE: 6,
    NEAR: 0.1,
    FAR: 200
});

export const COLORS = Object.freeze({
    BACKGROUND: 0x1b1033,
    SKY: 0xbfd9ff,
    GROUND_LIGHT: 0x3a2a55,
    ARENA: 0x2d6a8f,
    RIM: 0x8fd3ff,
    ORB: 0xffc857,
    GEM: 0x5cf2b2,
    GEM_EMISSIVE: 0x1e7a57
});

export const LIGHTING = Object.freeze({
    HEMI_INTENSITY: 1.1,
    SUN_INTENSITY: 2.2,
    SUN_X: 8,
    SUN_Y: 20,
    SUN_Z: 6,
    SHADOW_MAP_SIZE: 1024,
    SHADOW_EXTENT: 14,
    FOG_NEAR: 30,
    FOG_FAR: 70
});

export const MATERIALS = Object.freeze({
    ARENA_ROUGHNESS: 0.85,
    ORB_ROUGHNESS: 0.35,
    ORB_METALNESS: 0.1,
    GEM_ROUGHNESS: 0.2,
    GEM_EMISSIVE_INTENSITY: 0.8
});

export const AUDIO = Object.freeze({
    VOLUME: 0.2,
    PICKUP_FROM_HZ: 660,
    PICKUP_TO_HZ: 1320,
    PICKUP_MS: 120,
    GAME_OVER_FROM_HZ: 440,
    GAME_OVER_TO_HZ: 110,
    GAME_OVER_MS: 450
});

export const TEXT = Object.freeze({
    TITLE: 'Gem Drift',
    HINT: 'Hold and drag, or use the arrow keys / WASD',
    PLAY: 'Play',
    PLAY_AGAIN: 'Play again',
    BEST: 'Best',
    SCORE: 'Score',
    TIME_UP: 'Time up!',
    NEW_BEST: 'New best!',
    COMBO_PREFIX: 'x',
    PAUSED: 'PAUSED'
});
