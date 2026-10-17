import Phaser from 'phaser';
import {
    ASSET_KEYS,
    CAR_ART,
    CAR_HEIGHT,
    CAR_SKINS,
    CAR_WIDTH,
    VISUALS,
    WRECK_KEYS,
    ZOMBIE_ART,
    ZOMBIE_KEYS
} from '@core/Constants';

function darken(color: number): number {
    return Phaser.Display.Color.ValueToColor(color).darken(CAR_ART.DARKEN_PERCENT).color;
}

function paintLights(g: Phaser.GameObjects.Graphics, width: number, height: number): void {
    const lightW = width * CAR_ART.LIGHT_W;
    const leftX = width * CAR_ART.LIGHT_X;
    const rightX = width * (1 - CAR_ART.LIGHT_X - CAR_ART.LIGHT_W);

    g.fillStyle(CAR_ART.HEADLIGHT_COLOR);
    g.fillRect(leftX, 0, lightW, CAR_ART.LIGHT_H);
    g.fillRect(rightX, 0, lightW, CAR_ART.LIGHT_H);

    g.fillStyle(CAR_ART.TAILLIGHT_COLOR);
    g.fillRect(leftX, height - CAR_ART.LIGHT_H, lightW, CAR_ART.LIGHT_H);
    g.fillRect(rightX, height - CAR_ART.LIGHT_H, lightW, CAR_ART.LIGHT_H);
}

function paintWheels(g: Phaser.GameObjects.Graphics, width: number, height: number): void {
    g.fillStyle(CAR_ART.WHEEL_COLOR);
    for (const row of [CAR_ART.WHEEL_FRONT_Y, CAR_ART.WHEEL_REAR_Y]) {
        g.fillRoundedRect(0, height * row, CAR_ART.WHEEL_W, height * CAR_ART.WHEEL_H, 3);
        g.fillRoundedRect(
            width - CAR_ART.WHEEL_W,
            height * row,
            CAR_ART.WHEEL_W,
            height * CAR_ART.WHEEL_H,
            3
        );
    }
}

function paintCar(
    g: Phaser.GameObjects.Graphics,
    color: number,
    width: number,
    height: number
): void {
    paintWheels(g, width, height);

    g.fillStyle(color);
    g.fillRoundedRect(
        CAR_ART.BODY_INSET,
        0,
        width - CAR_ART.BODY_INSET * 2,
        height,
        CAR_ART.BODY_RADIUS
    );

    g.fillStyle(darken(color));
    g.fillRoundedRect(
        width * CAR_ART.GLASS_X,
        height * CAR_ART.ROOF_Y,
        width * CAR_ART.GLASS_W,
        height * CAR_ART.ROOF_H,
        CAR_ART.GLASS_RADIUS
    );

    g.fillStyle(CAR_ART.GLASS_COLOR);
    g.fillRoundedRect(
        width * CAR_ART.GLASS_X,
        height * CAR_ART.FRONT_GLASS_Y,
        width * CAR_ART.GLASS_W,
        height * CAR_ART.FRONT_GLASS_H,
        CAR_ART.GLASS_RADIUS
    );
    g.fillRoundedRect(
        width * CAR_ART.GLASS_X,
        height * CAR_ART.REAR_GLASS_Y,
        width * CAR_ART.GLASS_W,
        height * CAR_ART.REAR_GLASS_H,
        CAR_ART.GLASS_RADIUS
    );

    paintLights(g, width, height);
}

function paintWreck(
    g: Phaser.GameObjects.Graphics,
    color: number,
    width: number,
    height: number
): void {
    paintCar(g, color, width, height);
    g.fillStyle(CAR_ART.WHEEL_COLOR, VISUALS.WRECK_SCORCH_ALPHA);
    g.fillRoundedRect(
        CAR_ART.BODY_INSET,
        0,
        width - CAR_ART.BODY_INSET * 2,
        height * VISUALS.WRECK_SCORCH_HEIGHT,
        CAR_ART.BODY_RADIUS
    );
}

function paintZombie(g: Phaser.GameObjects.Graphics, shirt: number, size: number): void {
    const c = size / 2;
    const armW = size * ZOMBIE_ART.ARM_W;
    const armH = size * ZOMBIE_ART.ARM_H;
    const armTop = size * ZOMBIE_ART.ARM_TOP;

    g.fillStyle(VISUALS.ZOMBIE_SKIN);
    g.fillRoundedRect(c - size * ZOMBIE_ART.ARM_X - armW / 2, armTop, armW, armH, armW / 2);
    g.fillRoundedRect(c + size * ZOMBIE_ART.ARM_X - armW / 2, armTop, armW, armH, armW / 2);
    g.fillStyle(VISUALS.ZOMBIE_SKIN_DARK);
    g.fillCircle(c - size * ZOMBIE_ART.ARM_X, armTop, size * ZOMBIE_ART.HAND_R);
    g.fillCircle(c + size * ZOMBIE_ART.ARM_X, armTop, size * ZOMBIE_ART.HAND_R);

    g.fillStyle(shirt);
    g.fillRoundedRect(
        c - (size * ZOMBIE_ART.TORSO_W) / 2,
        size * ZOMBIE_ART.TORSO_Y,
        size * ZOMBIE_ART.TORSO_W,
        size * ZOMBIE_ART.TORSO_H,
        ZOMBIE_ART.TORSO_RADIUS
    );

    g.fillStyle(VISUALS.ZOMBIE_SKIN);
    g.fillCircle(c, size * ZOMBIE_ART.HEAD_Y, size * ZOMBIE_ART.HEAD_R);
    g.fillStyle(VISUALS.ZOMBIE_EYE_COLOR);
    g.fillCircle(c - size * ZOMBIE_ART.EYE_X, size * ZOMBIE_ART.EYE_Y, size * ZOMBIE_ART.EYE_R);
    g.fillCircle(c + size * ZOMBIE_ART.EYE_X, size * ZOMBIE_ART.EYE_Y, size * ZOMBIE_ART.EYE_R);
}

function paintTree(g: Phaser.GameObjects.Graphics, size: number): void {
    const c = size / 2;
    g.fillStyle(VISUALS.TREE_DARK_COLOR);
    g.fillCircle(c, c, c);

    g.fillStyle(VISUALS.TREE_COLOR);
    for (let i = 0; i < VISUALS.TREE_BLOBS; i++) {
        const angle = (i / VISUALS.TREE_BLOBS) * Math.PI * 2;
        g.fillCircle(
            c + Math.cos(angle) * c * VISUALS.TREE_RING_RATIO,
            c + Math.sin(angle) * c * VISUALS.TREE_RING_RATIO,
            c * VISUALS.TREE_BLOB_RATIO
        );
    }

    g.fillStyle(VISUALS.TREE_CORE_COLOR);
    g.fillCircle(c, c, c * VISUALS.TREE_CORE_RATIO);
}

function paintRock(g: Phaser.GameObjects.Graphics, size: number): void {
    const c = size / 2;
    g.fillStyle(VISUALS.ROCK_DARK_COLOR);
    g.fillCircle(c, c, c * VISUALS.ROCK_OUTER_RATIO);
    g.fillStyle(VISUALS.ROCK_COLOR);
    g.fillCircle(
        c - c * VISUALS.ROCK_INNER_SHIFT,
        c - c * VISUALS.ROCK_INNER_SHIFT,
        c * VISUALS.ROCK_INNER_RATIO
    );
}

function paintCrate(g: Phaser.GameObjects.Graphics, size: number): void {
    g.fillStyle(VISUALS.CRATE_DARK_COLOR);
    g.fillRect(0, 0, size, size);
    g.fillStyle(VISUALS.CRATE_COLOR);
    g.fillRect(
        VISUALS.CRATE_BORDER,
        VISUALS.CRATE_BORDER,
        size - VISUALS.CRATE_BORDER * 2,
        size - VISUALS.CRATE_BORDER * 2
    );
    g.lineStyle(VISUALS.CRATE_PLANK, VISUALS.CRATE_DARK_COLOR);
    g.lineBetween(
        VISUALS.CRATE_BORDER,
        VISUALS.CRATE_BORDER,
        size - VISUALS.CRATE_BORDER,
        size - VISUALS.CRATE_BORDER
    );
    g.lineBetween(
        size - VISUALS.CRATE_BORDER,
        VISUALS.CRATE_BORDER,
        VISUALS.CRATE_BORDER,
        size - VISUALS.CRATE_BORDER
    );
}

function paintBarrel(g: Phaser.GameObjects.Graphics, size: number): void {
    const c = size / 2;
    g.fillStyle(VISUALS.BARREL_COLOR);
    g.fillCircle(c, c, c);
    g.lineStyle(VISUALS.BARREL_RING_WIDTH, VISUALS.BARREL_RING_COLOR);
    g.strokeCircle(c, c, c * VISUALS.BARREL_RING_RATIO);
    g.fillStyle(VISUALS.BARREL_CORE_COLOR);
    g.fillCircle(c, c, c * VISUALS.BARREL_CORE_RATIO);
}

function paintGround(g: Phaser.GameObjects.Graphics, size: number): void {
    const half = size / 2;
    g.fillStyle(VISUALS.GROUND_COLOR);
    g.fillRect(0, 0, size, size);
    g.fillStyle(VISUALS.GROUND_DARK_COLOR);
    g.fillRect(0, 0, half, half);
    g.fillRect(half, half, half, half);

    g.fillStyle(VISUALS.GROUND_SPECK_COLOR);
    for (let i = 0; i < VISUALS.GROUND_SPECKS; i++) {
        g.fillRect(
            (i * VISUALS.GROUND_SPECK_STEP_X) % size,
            (i * VISUALS.GROUND_SPECK_STEP_Y) % size,
            VISUALS.GROUND_SPECK_SIZE,
            VISUALS.GROUND_SPECK_SIZE
        );
    }
}

function paintHeal(g: Phaser.GameObjects.Graphics, size: number): void {
    const c = size / 2;
    const long = size * VISUALS.HEAL_CROSS_LONG;
    const short = size * VISUALS.HEAL_CROSS_SHORT;
    g.fillStyle(VISUALS.HEAL_COLOR);
    g.fillCircle(c, c, c);
    g.fillStyle(VISUALS.HEAL_CROSS_COLOR);
    g.fillRect(c - long / 2, c - short / 2, long, short);
    g.fillRect(c - short / 2, c - long / 2, short, long);
}

function paintNitro(g: Phaser.GameObjects.Graphics, size: number): void {
    const c = size / 2;
    const bolt = VISUALS.NITRO_BOLT;
    g.fillStyle(VISUALS.NITRO_COLOR);
    g.fillCircle(c, c, c);
    g.fillStyle(VISUALS.EDGE_COLOR);
    g.fillTriangle(c + bolt, c * 0.3, c - bolt * 2, c * 1.1, c + bolt / 3, c * 1.1);
    g.fillTriangle(c - bolt, c * 1.7, c + bolt * 2, c * 0.9, c - bolt / 3, c * 0.9);
}

function paintHapticsIcon(g: Phaser.GameObjects.Graphics, enabled: boolean): void {
    const cx = VISUALS.ICON_W / 2;
    const cy = VISUALS.ICON_H / 2;

    g.lineStyle(VISUALS.ICON_LINE, VISUALS.ICON_COLOR);
    g.strokeRoundedRect(
        cx - VISUALS.ICON_PHONE_W / 2,
        cy - VISUALS.ICON_PHONE_H / 2,
        VISUALS.ICON_PHONE_W,
        VISUALS.ICON_PHONE_H,
        CAR_ART.GLASS_RADIUS / 2
    );

    for (const radius of [VISUALS.ICON_WAVE_NEAR, VISUALS.ICON_WAVE_FAR]) {
        for (const center of [Math.PI, 0]) {
            g.beginPath();
            g.arc(cx, cy, radius, center - VISUALS.ICON_WAVE_SPAN, center + VISUALS.ICON_WAVE_SPAN);
            g.strokePath();
        }
    }

    if (!enabled) {
        g.lineStyle(VISUALS.ICON_SLASH_LINE, VISUALS.ICON_SLASH_COLOR);
        g.lineBetween(
            VISUALS.ICON_SLASH_INSET,
            VISUALS.ICON_SLASH_INSET,
            VISUALS.ICON_W - VISUALS.ICON_SLASH_INSET,
            VISUALS.ICON_H - VISUALS.ICON_SLASH_INSET
        );
    }
}

/** Paints every gameplay texture once at boot, so the bundle ships no extra image files. */
export function generateArenaTextures(scene: Phaser.Scene): void {
    const g = scene.make.graphics({}, false);
    const make = (key: string, width: number, height: number, paint: () => void): void => {
        g.clear();
        paint();
        g.generateTexture(key, width, height);
    };

    make(ASSET_KEYS.GROUND, VISUALS.GROUND_TILE, VISUALS.GROUND_TILE, () =>
        paintGround(g, VISUALS.GROUND_TILE)
    );

    for (const skin of CAR_SKINS) {
        make(skin.id, CAR_WIDTH, CAR_HEIGHT, () => paintCar(g, skin.color, CAR_WIDTH, CAR_HEIGHT));
    }

    WRECK_KEYS.forEach((key, index) => {
        const color = VISUALS.WRECK_COLORS[index] ?? VISUALS.ROCK_COLOR;
        make(key, CAR_WIDTH, CAR_HEIGHT, () => paintWreck(g, color, CAR_WIDTH, CAR_HEIGHT));
    });

    ZOMBIE_KEYS.forEach((key, index) => {
        const shirt = VISUALS.ZOMBIE_SHIRTS[index] ?? VISUALS.ZOMBIE_SHIRTS[0] ?? 0;
        make(key, VISUALS.ZOMBIE_SIZE, VISUALS.ZOMBIE_SIZE, () =>
            paintZombie(g, shirt, VISUALS.ZOMBIE_SIZE)
        );
    });

    make(ASSET_KEYS.TREE, VISUALS.TREE_SIZE, VISUALS.TREE_SIZE, () =>
        paintTree(g, VISUALS.TREE_SIZE)
    );
    make(ASSET_KEYS.ROCK, VISUALS.ROCK_SIZE, VISUALS.ROCK_SIZE, () =>
        paintRock(g, VISUALS.ROCK_SIZE)
    );
    make(ASSET_KEYS.CRATE, VISUALS.CRATE_SIZE, VISUALS.CRATE_SIZE, () =>
        paintCrate(g, VISUALS.CRATE_SIZE)
    );
    make(ASSET_KEYS.BARREL, VISUALS.BARREL_SIZE, VISUALS.BARREL_SIZE, () =>
        paintBarrel(g, VISUALS.BARREL_SIZE)
    );
    make(ASSET_KEYS.HEAL, VISUALS.PICKUP_SIZE, VISUALS.PICKUP_SIZE, () =>
        paintHeal(g, VISUALS.PICKUP_SIZE)
    );
    make(ASSET_KEYS.NITRO, VISUALS.PICKUP_SIZE, VISUALS.PICKUP_SIZE, () =>
        paintNitro(g, VISUALS.PICKUP_SIZE)
    );

    make(ASSET_KEYS.HAPTICS_ON, VISUALS.ICON_W, VISUALS.ICON_H, () => paintHapticsIcon(g, true));
    make(ASSET_KEYS.HAPTICS_OFF, VISUALS.ICON_W, VISUALS.ICON_H, () => paintHapticsIcon(g, false));

    make(ASSET_KEYS.SPARK, VISUALS.SPARK_SIZE, VISUALS.SPARK_SIZE, () => {
        g.fillStyle(VISUALS.EDGE_COLOR);
        g.fillCircle(VISUALS.SPARK_SIZE / 2, VISUALS.SPARK_SIZE / 2, VISUALS.SPARK_SIZE / 2);
    });

    g.destroy();
}
