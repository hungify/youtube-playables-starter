import { ARENA, COIN, PLAYER, ROUND } from './Constants';

/** Position and velocity in game pixels. Mutated in place to avoid garbage. */
export interface Body {
    x: number;
    y: number;
    vx: number;
    vy: number;
}

export interface Point {
    x: number;
    y: number;
}

/** Clamps an input direction to length 1 so diagonals are not faster. */
export function clampInput(out: Point, x: number, y: number): Point {
    const length = Math.hypot(x, y);
    const k = length > 1 ? 1 / length : 1;
    out.x = x * k;
    out.y = y * k;
    return out;
}

/** Accelerates towards the input, applies drag and the speed cap, then bounces off the rim. */
export function stepPlayer(player: Body, inputX: number, inputY: number, dtSec: number): void {
    player.vx += inputX * PLAYER.ACCEL * dtSec;
    player.vy += inputY * PLAYER.ACCEL * dtSec;

    const damping = Math.exp(-PLAYER.DRAG * dtSec);
    player.vx *= damping;
    player.vy *= damping;

    const speed = Math.hypot(player.vx, player.vy);
    if (speed > PLAYER.MAX_SPEED) {
        const k = PLAYER.MAX_SPEED / speed;
        player.vx *= k;
        player.vy *= k;
    }

    player.x += player.vx * dtSec;
    player.y += player.vy * dtSec;

    const limit = ARENA.RADIUS - PLAYER.RADIUS;
    const distance = Math.hypot(player.x, player.y);
    if (distance > limit) {
        const nx = player.x / distance;
        const ny = player.y / distance;
        player.x = nx * limit;
        player.y = ny * limit;

        const radial = player.vx * nx + player.vy * ny;
        if (radial > 0) {
            player.vx -= (1 + PLAYER.BOUNCE) * radial * nx;
            player.vy -= (1 + PLAYER.BOUNCE) * radial * ny;
        }
    }
}

export function isCoinCollected(player: Point, coin: Point): boolean {
    return Math.hypot(player.x - coin.x, player.y - coin.y) <= PLAYER.RADIUS + COIN.RADIUS;
}

/**
 * Picks a coin spot inside the arena and away from the player. `rng` returns [0, 1) so tests can
 * pass a fixed sequence. Falls back to the point opposite the player if every attempt is too close.
 */
export function placeCoin(out: Point, player: Point, rng: () => number): Point {
    const maxRadius = ARENA.RADIUS - COIN.EDGE_MARGIN;
    for (let i = 0; i < COIN.SPAWN_ATTEMPTS; i++) {
        const angle = rng() * Math.PI * 2;
        // sqrt keeps the spawn density uniform over the disc.
        const radius = Math.sqrt(rng()) * maxRadius;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (Math.hypot(x - player.x, y - player.y) >= COIN.MIN_SPAWN_DISTANCE) {
            out.x = x;
            out.y = y;
            return out;
        }
    }

    const distance = Math.hypot(player.x, player.y);
    out.x = (distance > 0 ? -player.x / distance : 1) * maxRadius;
    out.y = (distance > 0 ? -player.y / distance : 0) * maxRadius;
    return out;
}

/** Combo after a pickup: grows while coins come within the window, otherwise restarts at 1. */
export function nextCombo(combo: number, msSinceLastCoin: number): number {
    return msSinceLastCoin <= ROUND.COMBO_WINDOW_MS ? Math.min(combo + 1, ROUND.MAX_COMBO) : 1;
}

export function coinPoints(combo: number): number {
    return ROUND.COIN_POINTS * Math.max(1, combo);
}

export function timeAfterCoin(timeLeftMs: number): number {
    return Math.min(timeLeftMs + ROUND.COIN_TIME_BONUS_MS, ROUND.MAX_TIME_MS);
}

export function sanitizeBestScore(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0
        ? Math.floor(value)
        : null;
}
