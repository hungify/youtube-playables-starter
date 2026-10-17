import { ARENA, GEM, ORB, ROUND } from './Constants';

/** Position and velocity on the arena floor (XZ plane). Mutated in place to avoid garbage. */
export interface Body {
    x: number;
    z: number;
    vx: number;
    vz: number;
}

export interface Point {
    x: number;
    z: number;
}

/** Clamps an input direction to length 1 so diagonals are not faster. */
export function clampInput(out: Point, x: number, z: number): Point {
    const length = Math.hypot(x, z);
    const k = length > 1 ? 1 / length : 1;
    out.x = x * k;
    out.z = z * k;
    return out;
}

/** Accelerates towards the input, applies drag and the speed cap, then bounces off the rim. */
export function stepOrb(orb: Body, inputX: number, inputZ: number, dtSec: number): void {
    orb.vx += inputX * ORB.ACCEL * dtSec;
    orb.vz += inputZ * ORB.ACCEL * dtSec;

    const damping = Math.exp(-ORB.DRAG * dtSec);
    orb.vx *= damping;
    orb.vz *= damping;

    const speed = Math.hypot(orb.vx, orb.vz);
    if (speed > ORB.MAX_SPEED) {
        const k = ORB.MAX_SPEED / speed;
        orb.vx *= k;
        orb.vz *= k;
    }

    orb.x += orb.vx * dtSec;
    orb.z += orb.vz * dtSec;

    const limit = ARENA.RADIUS - ORB.RADIUS;
    const distance = Math.hypot(orb.x, orb.z);
    if (distance > limit) {
        const nx = orb.x / distance;
        const nz = orb.z / distance;
        orb.x = nx * limit;
        orb.z = nz * limit;

        const radial = orb.vx * nx + orb.vz * nz;
        if (radial > 0) {
            orb.vx -= (1 + ORB.BOUNCE) * radial * nx;
            orb.vz -= (1 + ORB.BOUNCE) * radial * nz;
        }
    }
}

export function isGemCollected(orb: Point, gem: Point): boolean {
    return Math.hypot(orb.x - gem.x, orb.z - gem.z) <= ORB.RADIUS + GEM.RADIUS;
}

/**
 * Picks a gem spot inside the arena and away from the orb. `rng` returns [0, 1) so tests can
 * pass a fixed sequence. Falls back to the point opposite the orb if every attempt is too close.
 */
export function placeGem(out: Point, orb: Point, rng: () => number): Point {
    const maxRadius = ARENA.RADIUS - GEM.EDGE_MARGIN;
    for (let i = 0; i < GEM.SPAWN_ATTEMPTS; i++) {
        const angle = rng() * Math.PI * 2;
        // sqrt keeps the spawn density uniform over the disc.
        const radius = Math.sqrt(rng()) * maxRadius;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        if (Math.hypot(x - orb.x, z - orb.z) >= GEM.MIN_SPAWN_DISTANCE) {
            out.x = x;
            out.z = z;
            return out;
        }
    }

    const distance = Math.hypot(orb.x, orb.z);
    const nx = distance > 0 ? -orb.x / distance : 1;
    const nz = distance > 0 ? -orb.z / distance : 0;
    out.x = nx * maxRadius;
    out.z = nz * maxRadius;
    return out;
}

/** Combo after a pickup: grows while gems come within the window, otherwise restarts at 1. */
export function nextCombo(combo: number, msSinceLastGem: number): number {
    return msSinceLastGem <= ROUND.COMBO_WINDOW_MS ? Math.min(combo + 1, ROUND.MAX_COMBO) : 1;
}

export function gemPoints(combo: number): number {
    return ROUND.GEM_POINTS * Math.max(1, combo);
}

export function timeAfterGem(timeLeftMs: number): number {
    return Math.min(timeLeftMs + ROUND.GEM_TIME_BONUS_MS, ROUND.MAX_TIME_MS);
}

export function sanitizeBestScore(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0
        ? Math.floor(value)
        : null;
}
