export const GAME_CONFIG = Object.freeze({
    WIDTH: 820,
    HEIGHT: 1180,
    LOAD_DATA_TIMEOUT_MS: 1000,
    MAX_FRAME_MS: 50,
    MS_PER_SECOND: 1000
} as const);

export const SCENE_KEYS = Object.freeze({
    BOOT: 'Boot',
    PRELOADER: 'Preloader',
    MAIN_MENU: 'MainMenu',
    GAME: 'Game',
    GAME_OVER: 'GameOver',
    UI: 'UI'
} as const);

export const ASSET_KEYS = Object.freeze({
    AUDIO_ON: 'audio-on',
    AUDIO_OFF: 'audio-off',
    HAPTICS_ON: 'haptics-on',
    HAPTICS_OFF: 'haptics-off',
    GROUND: 'ground',
    TREE: 'tree',
    ROCK: 'rock',
    CRATE: 'crate',
    BARREL: 'barrel',
    WRECK_A: 'wreck-a',
    WRECK_B: 'wreck-b',
    WRECK_C: 'wreck-c',
    ZOMBIE_A: 'zombie-a',
    ZOMBIE_B: 'zombie-b',
    ZOMBIE_C: 'zombie-c',
    HEAL: 'heal',
    NITRO: 'nitro',
    SPARK: 'spark'
} as const);

export const ASSET_PATHS = Object.freeze({
    ROOT: 'assets',
    FX: 'assets/fx'
} as const);

export const AUDIO_KEYS = Object.freeze({
    SMASH: 'smash',
    CRASH: 'crash',
    BITE: 'bite',
    EXPLOSION: 'explosion',
    PICKUP: 'pickup',
    NITRO: 'nitro',
    WAVE: 'wave',
    ENGINE: 'engine'
} as const);

export const WRECK_KEYS = [ASSET_KEYS.WRECK_A, ASSET_KEYS.WRECK_B, ASSET_KEYS.WRECK_C] as const;
export const ZOMBIE_KEYS = [ASSET_KEYS.ZOMBIE_A, ASSET_KEYS.ZOMBIE_B, ASSET_KEYS.ZOMBIE_C] as const;

export const CAR_WIDTH = 92;
export const CAR_HEIGHT = 160;

export const ARENA = Object.freeze({
    WORLD_W: 1500,
    WORLD_H: 1500,
    PLAYER_START_X: 750,
    PLAYER_START_Y: 900,
    START_HEADING: -Math.PI / 2,
    START_CLEAR_RADIUS: 240,

    CAR_SCALE: 0.6,
    PLAYER_RADIUS: 32,
    MAX_HEALTH: 100,
    REVIVE_HEALTH: 50,
    REVIVE_BLAST_RADIUS: 420,

    // Vehicle model
    MAX_SPEED: 520,
    BOOST_SPEED_MULT: 1.5,
    ACCEL: 640,
    BRAKE: 520,
    REVERSE_MAX_SPEED: 180,
    REVERSE_ACCEL_FACTOR: 0.7,
    DRAG: 220,
    TURN_RATE: 4.2,
    TURN_FULL_SPEED: 140,
    MIN_TURN_FACTOR: 0.35,
    STEER_DEAD_ZONE_PX: 60,
    WALL_SPEED_KEEP: 0.35,
    WORLD_MARGIN: 20,

    // Impacts
    SOLID_DAMAGE_SPEED: 260,
    SOLID_DAMAGE_PER_SPEED: 0.06,
    BOUNCE_KEEP: 0.3,
    CRATE_SPEED_KEEP: 0.85,
    SMASH_MIN_SPEED: 130,
    BOSS_KNOCKBACK_SPEED_KEEP: 0.6,
    SMASH_SPEED_KEEP: 0.96,

    // Zombies
    ZOMBIE_RADIUS: 22,
    ZOMBIE_SCALE: 0.75,
    BOSS_RADIUS: 40,
    BOSS_SCALE: 1.45,
    BOSS_BASE_HP: 3,
    ZOMBIE_SPEED_BASE: 70,
    ZOMBIE_SPEED_PER_WAVE: 5,
    ZOMBIE_SPEED_MAX: 150,
    BOSS_SPEED_FACTOR: 0.75,
    ZOMBIE_SPEED_JITTER: 0.15,
    ZOMBIE_WOBBLE_PX_S: 28,
    ZOMBIE_WOBBLE_HZ: 1.6,
    BITE_DPS: 6,
    BOSS_BITE_DPS: 12,
    MAX_BITERS: 3,
    ZOMBIE_POOL_SIZE: 48,
    ZOMBIE_CAP: 40,
    SPAWN_MIN_DISTANCE: 520,
    SPAWN_STAGGER_MS: 140,
    WAVE_START_DELAY_MS: 1800,
    WAVE_BASE_COUNT: 6,
    WAVE_COUNT_PER_WAVE: 3,
    BOSS_EVERY_WAVES: 5,
    WAVE_CLEAR_DELAY_MS: 3600,
    WAVE_DROP_HEAL_CHANCE: 0.5,
    BOSS_KNOCKBACK_RADII: 2,
    SPRITE_ROTATION_OFFSET: Math.PI / 2,
    RUNNER_FIRST_WAVE: 3,
    RUNNER_CHANCE_PER_WAVE: 0.1,
    RUNNER_CHANCE_MAX: 0.4,
    RUNNER_SPEED_MULT: 1.8,
    RUNNER_RADIUS: 17,
    RUNNER_SCALE: 0.62,
    RAM_DAMAGE_STEP: 180,
    RAM_DAMAGE_MAX: 3,

    // Map objects
    TREES: 10,
    ROCKS: 6,
    WRECKS: 4,
    CRATES: 10,
    BARRELS: 6,
    TREE_RADIUS: 34,
    ROCK_RADIUS: 28,
    WRECK_RADIUS: 36,
    CRATE_RADIUS: 26,
    BARREL_RADIUS: 22,
    MAP_MARGIN: 90,
    MAP_MIN_GAP: 160,
    MAP_SOFT_GAP: 70,
    MAP_PLACE_TRIES: 60,

    // Barrels, crates, pickups
    BLAST_RADIUS: 170,
    BLAST_CAR_RADIUS: 120,
    BLAST_CAR_DAMAGE: 12,
    BLAST_SPEED_KEEP: 0.7,
    CRATE_HEAL_CHANCE: 0.35,
    CRATE_NITRO_CHANCE: 0.25,
    HEAL_AMOUNT: 30,
    NITRO_MS: 4000,
    PICKUP_RADIUS: 30,
    PICKUP_POOL_SIZE: 16,
    WAVE_DROP_TRIES: 25,
    WAVE_DROP_MARGIN: 160,

    QA_NEAREST_ZOMBIES: 5,
    STUCK_SPEED: 40,
    STUCK_AFTER_MS: 500,
    STUCK_REVERSE_MS: 380,
    RADAR_STRIDE: 3,
    COMBO_WINDOW_MS: 4000,
    MAX_COMBO_MULT: 5
} as const);

export const SCORE_VALUES = Object.freeze({
    SMASH: 30,
    BOSS_SMASH: 150,
    BARREL: 10,
    WAVE_CLEAR: 100,
    PICKUP: 10,
    RUNNER_MULT: 1.5
} as const);

/** Playables design requirement: touch targets of at least 48dp, 8dp apart. */
export const TOUCH = Object.freeze({
    MIN_TARGET_DP: 48,
    GAP_DP: 8
} as const);

export interface UpgradeDef {
    readonly id: string;
    readonly label: string;
    readonly maxLevel: number;
    readonly baseCost: number;
    readonly costGrowth: number;
    readonly perLevel: number;
}

/** Permanent car upgrades bought with scrap between runs. */
export const UPGRADES = [
    { id: 'armor', label: 'ARMOR', maxLevel: 5, baseCost: 40, costGrowth: 1.6, perLevel: 20 },
    { id: 'engine', label: 'ENGINE', maxLevel: 5, baseCost: 50, costGrowth: 1.6, perLevel: 0.08 },
    { id: 'ram', label: 'RAM', maxLevel: 5, baseCost: 45, costGrowth: 1.6, perLevel: 12 },
    { id: 'nitro', label: 'NITRO', maxLevel: 5, baseCost: 35, costGrowth: 1.6, perLevel: 0.2 }
] as const satisfies readonly UpgradeDef[];

export type UpgradeId = (typeof UPGRADES)[number]['id'];

export const SCRAP = Object.freeze({
    PER_SMASH: 2,
    PER_WAVE: 8,
    MIN_SMASH_SPEED_FLOOR: 60
} as const);

export const COMBO_STREAKS: readonly number[] = [5, 10, 25];

export interface CarSkin {
    readonly id: string;
    readonly label: string;
    readonly color: number;
    readonly unlockScore: number;
}

export const CAR_SKINS = [
    { id: 'car1', label: 'Rookie', color: 0xe53935, unlockScore: 0 },
    { id: 'car2', label: 'Sprint', color: 0x1e88e5, unlockScore: 1500 },
    { id: 'car3', label: 'Racer', color: 0x43a047, unlockScore: 4000 },
    { id: 'car4', label: 'Turbo', color: 0xfdd835, unlockScore: 8000 },
    { id: 'car5', label: 'Phantom', color: 0x8e24aa, unlockScore: 15000 }
] as const satisfies readonly CarSkin[];

export type CarId = (typeof CAR_SKINS)[number]['id'];

export const DEFAULT_CAR: CarId = 'car1';

/** Proportions (of car width/height) used to paint the generated car textures. */
export const CAR_ART = Object.freeze({
    BODY_INSET: 4,
    BODY_RADIUS: 18,
    GLASS_COLOR: 0x263238,
    GLASS_X: 0.2,
    GLASS_W: 0.6,
    FRONT_GLASS_Y: 0.2,
    FRONT_GLASS_H: 0.2,
    REAR_GLASS_Y: 0.62,
    REAR_GLASS_H: 0.14,
    GLASS_RADIUS: 8,
    ROOF_Y: 0.4,
    ROOF_H: 0.22,
    WHEEL_COLOR: 0x111111,
    WHEEL_W: 10,
    WHEEL_H: 0.17,
    WHEEL_FRONT_Y: 0.12,
    WHEEL_REAR_Y: 0.7,
    HEADLIGHT_COLOR: 0xfff9c4,
    TAILLIGHT_COLOR: 0xff1744,
    LIGHT_W: 0.2,
    LIGHT_H: 8,
    LIGHT_X: 0.12,
    DARKEN_PERCENT: 25
} as const);

/** Proportions (of ZOMBIE_SIZE) used to paint the top-down zombie textures. */
export const ZOMBIE_ART = Object.freeze({
    ARM_W: 0.15,
    ARM_X: 0.3,
    ARM_TOP: 0.04,
    ARM_H: 0.46,
    HAND_R: 0.09,
    TORSO_W: 0.68,
    TORSO_Y: 0.4,
    TORSO_H: 0.4,
    TORSO_RADIUS: 10,
    HEAD_Y: 0.56,
    HEAD_R: 0.21,
    EYE_X: 0.09,
    EYE_Y: 0.47,
    EYE_R: 0.04
} as const);

export const VISUALS = Object.freeze({
    GROUND_TILE: 128,
    GROUND_COLOR: 0x4a5636,
    GROUND_DARK_COLOR: 0x435030,
    GROUND_SPECK_COLOR: 0x5d6b43,
    GROUND_SPECKS: 14,
    GROUND_SPECK_SIZE: 4,
    GROUND_SPECK_STEP_X: 47,
    GROUND_SPECK_STEP_Y: 83,
    FENCE_COLOR: 0x263238,
    FENCE_WIDTH: 16,
    OUTSIDE_COLOR: 0x1b2418,

    TREE_SIZE: 112,
    TREE_COLOR: 0x2e5d2c,
    TREE_DARK_COLOR: 0x244b23,
    TREE_BLOBS: 6,
    TREE_RING_RATIO: 0.4,
    TREE_BLOB_RATIO: 0.5,
    TREE_CORE_RATIO: 0.35,
    TREE_CORE_COLOR: 0x3f7a3a,
    ROCK_SIZE: 72,
    ROCK_COLOR: 0x78818a,
    ROCK_DARK_COLOR: 0x5a636b,
    ROCK_OUTER_RATIO: 0.95,
    ROCK_INNER_RATIO: 0.68,
    ROCK_INNER_SHIFT: 0.12,
    CRATE_SIZE: 60,
    CRATE_COLOR: 0xa1773f,
    CRATE_DARK_COLOR: 0x6d4c27,
    CRATE_BORDER: 6,
    CRATE_PLANK: 5,
    BARREL_SIZE: 52,
    BARREL_COLOR: 0xc62828,
    BARREL_RING_COLOR: 0xffd54f,
    BARREL_RING_RATIO: 0.68,
    BARREL_RING_WIDTH: 5,
    BARREL_CORE_RATIO: 0.4,
    BARREL_CORE_COLOR: 0x8e0000,
    PICKUP_SIZE: 60,
    HEAL_COLOR: 0xffffff,
    HEAL_CROSS_COLOR: 0xe53935,
    HEAL_CROSS_LONG: 0.6,
    HEAL_CROSS_SHORT: 0.2,
    NITRO_COLOR: 0x29b6f6,
    NITRO_BOLT: 6,
    SPARK_SIZE: 12,
    ICON_W: 80,
    ICON_H: 64,
    ICON_COLOR: 0xffffff,
    ICON_LINE: 4,
    ICON_PHONE_W: 22,
    ICON_PHONE_H: 38,
    ICON_WAVE_NEAR: 28,
    ICON_WAVE_FAR: 37,
    ICON_WAVE_SPAN: Math.PI / 4,
    ICON_SLASH_COLOR: 0xff5252,
    ICON_SLASH_LINE: 6,
    ICON_SLASH_INSET: 10,
    ICON_GAP: 8,
    WRECK_COLORS: [0x8d6e63, 0x546e7a, 0x757575],
    WRECK_SCORCH_ALPHA: 0.4,
    WRECK_SCORCH_HEIGHT: 0.5,
    ZOMBIE_SIZE: 76,
    ZOMBIE_SKIN: 0x7cb342,
    ZOMBIE_SKIN_DARK: 0x558b2f,
    ZOMBIE_SHIRTS: [0x8d6e63, 0x5c6bc0, 0xc62828],
    ZOMBIE_EYE_COLOR: 0xfff59d,
    BOSS_TINT: 0xff8a65,
    RUNNER_TINT: 0xfff176,
    AIM_RADIUS: 30,
    AIM_WIDTH: 4,
    AIM_ALPHA: 0.6,
    AIM_COLOR: 0xffffff,
    EDGE_COLOR: 0xffffff,

    DEPTH_GROUND: 0,
    DEPTH_PICKUP: 4,
    DEPTH_OBJECT: 5,
    DEPTH_ZOMBIE: 6,
    DEPTH_CAR: 10,
    DEPTH_TREE: 12,
    DEPTH_FX: 15,
    DEPTH_OVERLAY: 30,

    CAMERA_LERP: 0.12,
    BLINK_MS: 90,
    BLINK_ALPHA: 0.35,
    SHAKE_MS: 260,
    SHAKE_INTENSITY: 0.014,
    SMASH_SHAKE_MS: 90,
    SMASH_SHAKE_INTENSITY: 0.005,
    BLAST_SHAKE_MS: 380,
    BLAST_SHAKE_INTENSITY: 0.022,
    FLASH_MS: 180,
    FLASH_COLOR: 0xff5252,
    SMASH_PARTICLES: 16,
    SMASH_TINTS: [0x76ff03, 0x558b2f, 0xc6ff00],
    CRASH_PARTICLES: 28,
    CRASH_TINTS: [0xffc107, 0xff7043, 0xffffff],
    BLAST_PARTICLES: 60,
    BLAST_TINTS: [0xff6d00, 0xffc107, 0xffffff],
    PARTICLE_SPEED_MIN: 150,
    PARTICLE_SPEED_MAX: 420,
    PARTICLE_LIFESPAN_MS: 500,
    PARTICLE_SCALE: 1.5,
    ZOMBIE_WOBBLE_DEG: 12,
    ZOMBIE_WOBBLE_MS: 380,
    INVULNERABLE_MS: 1500,
    ENDING_DELAY_MS: 800,
    HINT_MS: 4500,
    POPUP_POOL_SIZE: 10,
    POPUP_RISE_PX: 90,
    POPUP_MS: 700,
    BANNER_MS: 1400,
    NITRO_FLAME_FREQUENCY_MS: 18,
    NITRO_FLAME_LIFESPAN_MS: 260,
    NITRO_FLAME_SPEED_MIN: 120,
    NITRO_FLAME_SPEED_MAX: 240,
    NITRO_FLAME_SCALE: 1.2,
    NITRO_FLAME_TINTS: [0x29b6f6, 0xffffff],
    DUST_SPEED: 180,
    DUST_FREQUENCY_MS: 45,
    DUST_LIFESPAN_MS: 420,
    DUST_SCALE_START: 0.9,
    DUST_SPEED_MIN: 10,
    DUST_SPEED_MAX: 40,
    DUST_ALPHA: 0.5,
    DUST_TINTS: [0xb0a58a, 0x8d8670],
    ENGINE_VOLUME: 0.22,
    ENGINE_RATE_MIN: 0.8,
    ENGINE_RATE_MAX: 1.9,
    BITE_SOUND_INTERVAL_MS: 450,
    MENU_CAR_BOB_PX: 14,
    MENU_CAR_BOB_MS: 900,
    MENU_ZOMBIES: 5,
    MENU_ZOMBIE_RING: 230,
    MENU_ZOMBIE_PHASE: Math.PI / 5,
    BANNER_Y_RATIO: 0.3,
    HINT_Y_RATIO: 0.65,
    HINT_FONT_SIZE: '34px',
    POPUP_FONT_SIZE: '38px',
    BANNER_FONT_SIZE: '84px',
    FULL_ALPHA: 1,
    OVERLAY_COLOR: 0x000000,
    OVERLAY_ALPHA: 0.6,
    REVIVE_BUTTON_GAP: 130
} as const);

/** Vibration patterns in milliseconds. Only used when the player has haptics switched on. */
export const HAPTICS = Object.freeze({
    SMASH: [12],
    BOSS: [40, 30, 40],
    BARREL: [80],
    CRASH: [70],
    PICKUP: [8],
    DEATH: [150],
    TOGGLE_ON: [20]
} as const);

export const INPUT_KEYS = 'W,A,S,D,UP,DOWN,LEFT,RIGHT';

/** Everything is laid out inside this centered 820x1180 frame, whatever the screen shape. */
export const LAYOUT = Object.freeze({
    LOADING_BAR_RATIO: 0.7,
    LOADING_BAR_HEIGHT: 32,
    LOADING_FILL_HEIGHT: 28,
    LOADING_PAD: 4,
    LOADING_COLOR: 0xffffff,
    LOADING_BORDER: 1,

    MENU_TITLE_Y: 250,
    MENU_BEST_Y: 380,
    MENU_CAR_Y: 60,
    MENU_CAR_SCALE_MULT: 1.4,
    MENU_PROMPT_FROM_BOTTOM: 260,

    OVER_CRASHED_Y: 140,
    OVER_SCORE_Y: 240,
    OVER_BEST_Y: 325,
    OVER_STATS_Y: 385,
    OVER_SHOP_TOP: 448,
    OVER_GARAGE_TOP: 804,
    OVER_RETRY_FROM_BOTTOM: 70,

    HUD_PADDING: 8,
    HUD_AUDIO_OFFSET_X: -8,
    HUD_SCORE_OFFSET_Y: 4,
    HUD_HEALTH_OFFSET_Y: 12,
    HUD_NITRO_OFFSET_Y: -24
} as const);

export const REVIVE_REWARD_ID = 'revive';

export const TEXT = Object.freeze({
    TITLE: 'ZOMBIE RUSH',
    TAP_TO_START: 'TAP TO DRIVE',
    HINT: 'DRAG TO DRIVE\nRAM ZOMBIES AT SPEED!',
    BEST: 'BEST',
    WAVE: 'WAVE',
    WAVE_CLEAR: 'WAVE CLEARED!',
    BOSS: 'BOSS INCOMING!',
    SMASH: 'SMASH!',
    BOOM: 'BOOM!',
    FASTER: 'GO FASTER TO SMASH!',
    PAUSED: 'PAUSED',
    NITRO_ON: 'NITRO!',
    REPAIR: 'REPAIRED!',
    COMBO: 'COMBO',
    LEFT: 'left',
    CRASHED: 'WRECKED!',
    NEW_BEST: 'NEW BEST!',
    RETRY: 'TAP TO RETRY',
    GARAGE: 'GARAGE',
    UNLOCK_AT: 'Score',
    STREAK: 'RAMPAGE',
    SMASHED: 'Zombies',
    REACHED: 'Wave',
    UPGRADES: 'UPGRADES',
    SCRAP: 'SCRAP',
    MAX_LEVEL: 'MAX',
    LEVEL: 'Lv',
    REVIVE_TITLE: 'ONE MORE CHANCE?',
    REVIVE_WATCH: 'WATCH AD: REPAIR CAR',
    REVIVE_SKIP: 'NO THANKS'
} as const);

export const UI_STYLE = Object.freeze({
    FONT_FAMILY: 'Arial Black',
    COLOR_WHITE: '#ffffff',
    COLOR_BLACK: '#000000',
    COLOR_ACCENT: '#ffc107',
    COLOR_DANGER: '#ff5252',
    COLOR_GOOD: '#9ccc65',
    COLOR_MUTED: '#b0bec5',
    STROKE_THICKNESS: 6,
    HUD_STROKE_THICKNESS: 8,
    HUD_SCORE_SIZE: '52px',
    BODY_HEIGHT_PX: 50,
    HEADING_HEIGHT_PX: 80,
    TRANSPARENT_COLOR: 0x000000,
    HUD_WAVE_SIZE: '30px',
    HUD_COMBO_SIZE: '34px',
    HUD_WAVE_OFFSET: 62,
    HUD_COMBO_OFFSET: 102,
    TITLE_SIZE: '88px',
    HEADING_SIZE: '64px',
    BODY_SIZE: '40px',
    SMALL_SIZE: '26px',
    RADAR_SIZE: 170,
    RADAR_BG: 0x000000,
    RADAR_BG_ALPHA: 0.45,
    RADAR_BORDER: 0xffffff,
    RADAR_BORDER_WIDTH: 3,
    RADAR_PLAYER_COLOR: 0xffffff,
    RADAR_ZOMBIE_COLOR: 0x76ff03,
    RADAR_BOSS_COLOR: 0xff5252,
    RADAR_PICKUP_COLOR: 0x29b6f6,
    RADAR_EVERY_FRAMES: 2,
    RADAR_DOT: 4,
    RADAR_BOSS_DOT: 7,
    RADAR_MARGIN: 14,
    HEALTH_BAR_WIDTH: 240,
    HEALTH_BAR_HEIGHT: 24,
    HEALTH_BAR_BG: 0x000000,
    HEALTH_BAR_BG_ALPHA: 0.5,
    HEALTH_COLOR: 0x76ff03,
    HEALTH_LOW_COLOR: 0xff5252,
    HEALTH_LOW_RATIO: 0.3,
    NITRO_BAR_WIDTH: 260,
    NITRO_BAR_HEIGHT: 18,
    NITRO_BAR_BG: 0x000000,
    NITRO_BAR_BG_ALPHA: 0.5,
    NITRO_FILL_COLOR: 0x29b6f6,
    SHOP_SCRAP_OFFSET: 52,
    SHOP_FIRST_ROW_OFFSET: 70,
    SHOP_CARD_W: 372,
    SHOP_CARD_H: 118,
    SHOP_CARD_GAP: 14,
    SHOP_CARD_COLOR: 0x000000,
    SHOP_CARD_ALPHA: 0.5,
    SHOP_CARD_BORDER: 3,
    SHOP_TITLE_SIZE: '32px',
    SHOP_LINE_SIZE: '24px',
    SHOP_LINE_GAP: 36,
    SHOP_IDLE_BORDER: 0x607d8b,
    SHOP_AFFORDABLE_BORDER: 0x9ccc65,
    GARAGE_CARS_OFFSET: 100,
    SKIN_TILE_SCALE: 0.5,
    SKIN_TILE_GAP: 130,
    SKIN_FRAME_W: 112,
    SKIN_FRAME_H: 200,
    SKIN_LABEL_OFFSET: 110,
    SKIN_LOCKED_TINT: 0x303030,
    SKIN_SELECTED_COLOR: 0xffc107
} as const);
