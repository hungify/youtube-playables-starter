import { ARENA, CAR_SKINS, SCORE_VALUES, type CarId } from './Constants';

export type Rng = () => number;
export type MapObjectKind = 'tree' | 'rock' | 'wreck' | 'crate' | 'barrel';
export type PickupKind = 'heal' | 'nitro';
export type ZombieKind = 'walker' | 'runner' | 'boss';

export interface MapObject {
    readonly kind: MapObjectKind;
    readonly x: number;
    readonly y: number;
    readonly radius: number;
    readonly rotation: number;
}

export interface Vehicle {
    readonly x: number;
    readonly y: number;
    readonly heading: number;
    readonly speed: number;
}

export interface VehicleCommand {
    /** -1 (full left) to 1 (full right), as a fraction of the maximum turn rate. */
    readonly turn: number;
    readonly throttle: boolean;
    readonly brake: boolean;
}

export interface Overlap {
    /** Unit normal pointing from the second circle towards the first. */
    readonly nx: number;
    readonly ny: number;
    readonly depth: number;
}

export interface SolidImpact {
    readonly impact: number;
    readonly damage: number;
    readonly speed: number;
}

export interface Point {
    readonly x: number;
    readonly y: number;
}

const TAU = Math.PI * 2;

export function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

export function wrapAngle(angle: number): number {
    let wrapped = (angle + Math.PI) % TAU;
    if (wrapped < 0) wrapped += TAU;
    return wrapped - Math.PI;
}

export function objectRadius(kind: MapObjectKind): number {
    switch (kind) {
        case 'tree':
            return ARENA.TREE_RADIUS;
        case 'rock':
            return ARENA.ROCK_RADIUS;
        case 'wreck':
            return ARENA.WRECK_RADIUS;
        case 'crate':
            return ARENA.CRATE_RADIUS;
        case 'barrel':
            return ARENA.BARREL_RADIUS;
    }
}

/** Solid objects stop the car; crates and barrels break when touched. */
export function isSolid(kind: MapObjectKind): boolean {
    return kind === 'tree' || kind === 'rock' || kind === 'wreck';
}

/** Solid objects need room to drive between them; breakable ones can sit closer. */
export function requiredGap(a: MapObjectKind, b: MapObjectKind): number {
    return isSolid(a) && isSolid(b) ? ARENA.MAP_MIN_GAP : ARENA.MAP_SOFT_GAP;
}

export function generateMap(rng: Rng): MapObject[] {
    const plan: ReadonlyArray<readonly [MapObjectKind, number]> = [
        ['wreck', ARENA.WRECKS],
        ['tree', ARENA.TREES],
        ['rock', ARENA.ROCKS],
        ['crate', ARENA.CRATES],
        ['barrel', ARENA.BARRELS]
    ];

    const objects: MapObject[] = [];
    for (const [kind, count] of plan) {
        const radius = objectRadius(kind);
        for (let placed = 0; placed < count; placed++) {
            for (let attempt = 0; attempt < ARENA.MAP_PLACE_TRIES; attempt++) {
                const x = ARENA.MAP_MARGIN + rng() * (ARENA.WORLD_W - ARENA.MAP_MARGIN * 2);
                const y = ARENA.MAP_MARGIN + rng() * (ARENA.WORLD_H - ARENA.MAP_MARGIN * 2);

                const startDistance = Math.hypot(
                    x - ARENA.PLAYER_START_X,
                    y - ARENA.PLAYER_START_Y
                );
                if (startDistance < ARENA.START_CLEAR_RADIUS + radius) continue;

                const blocked = objects.some(
                    (other) =>
                        Math.hypot(x - other.x, y - other.y) <
                        radius + other.radius + requiredGap(kind, other.kind)
                );
                if (blocked) continue;

                objects.push({ kind, x, y, radius, rotation: rng() * TAU });
                break;
            }
        }
    }
    return objects;
}

/** Free spot for a drop, away from every map object and the edges. */
export function findFreeSpot(
    rng: Rng,
    objects: readonly MapObject[],
    radius: number
): Point | null {
    for (let attempt = 0; attempt < ARENA.WAVE_DROP_TRIES; attempt++) {
        const x = ARENA.WAVE_DROP_MARGIN + rng() * (ARENA.WORLD_W - ARENA.WAVE_DROP_MARGIN * 2);
        const y = ARENA.WAVE_DROP_MARGIN + rng() * (ARENA.WORLD_H - ARENA.WAVE_DROP_MARGIN * 2);
        const free = objects.every(
            (other) => Math.hypot(x - other.x, y - other.y) > radius + other.radius
        );
        if (free) return { x, y };
    }
    return null;
}

export function maxSpeed(boosted: boolean, speedMult = 1): number {
    return ARENA.MAX_SPEED * speedMult * (boosted ? ARENA.BOOST_SPEED_MULT : 1);
}

function turnFactor(speed: number): number {
    return clamp(speed / ARENA.TURN_FULL_SPEED, ARENA.MIN_TURN_FACTOR, 1);
}

/** Turn command that steers the vehicle towards a point, saturating at the turn limit. */
export function turnCommand(
    vehicle: Vehicle,
    targetX: number,
    targetY: number,
    dtSec: number
): number {
    const desired = Math.atan2(targetY - vehicle.y, targetX - vehicle.x);
    const diff = wrapAngle(desired - vehicle.heading);
    const maxTurn = ARENA.TURN_RATE * turnFactor(vehicle.speed) * Math.max(dtSec, 1e-6);
    return clamp(diff / maxTurn, -1, 1);
}

export function wantsThrottle(vehicle: Vehicle, targetX: number, targetY: number): boolean {
    return Math.hypot(targetX - vehicle.x, targetY - vehicle.y) > ARENA.STEER_DEAD_ZONE_PX;
}

export function stepVehicle(
    vehicle: Vehicle,
    command: VehicleCommand,
    dtSec: number,
    boosted: boolean,
    speedMult = 1
): Vehicle & { readonly hitWall: boolean } {
    const heading = wrapAngle(
        vehicle.heading +
            clamp(command.turn, -1, 1) * ARENA.TURN_RATE * turnFactor(vehicle.speed) * dtSec
    );

    const top = maxSpeed(boosted, speedMult);
    let speed = vehicle.speed;
    if (command.throttle && speed <= top) {
        speed = Math.min(top, speed + ARENA.ACCEL * dtSec);
    } else if (command.brake) {
        speed =
            speed > 0
                ? Math.max(0, speed - ARENA.BRAKE * dtSec)
                : Math.max(
                      -ARENA.REVERSE_MAX_SPEED,
                      speed - ARENA.ACCEL * ARENA.REVERSE_ACCEL_FACTOR * dtSec
                  );
    } else if (speed > 0) {
        speed = Math.max(command.throttle ? top : 0, speed - ARENA.DRAG * dtSec);
    } else {
        speed = Math.min(0, speed + ARENA.DRAG * dtSec);
    }

    let x = vehicle.x + Math.cos(heading) * speed * dtSec;
    let y = vehicle.y + Math.sin(heading) * speed * dtSec;

    const minX = ARENA.WORLD_MARGIN + ARENA.PLAYER_RADIUS;
    const maxX = ARENA.WORLD_W - minX;
    const minY = ARENA.WORLD_MARGIN + ARENA.PLAYER_RADIUS;
    const maxY = ARENA.WORLD_H - minY;
    const hitWall = x < minX || x > maxX || y < minY || y > maxY;
    if (hitWall) {
        x = clamp(x, minX, maxX);
        y = clamp(y, minY, maxY);
        speed *= ARENA.WALL_SPEED_KEEP;
    }

    return { x, y, heading, speed, hitWall };
}

export function circleOverlap(
    ax: number,
    ay: number,
    ar: number,
    bx: number,
    by: number,
    br: number
): Overlap | null {
    const dx = ax - bx;
    const dy = ay - by;
    const reach = ar + br;
    // Cheap squared test first: most pairs are far apart and this avoids hypot and allocations.
    if (dx * dx + dy * dy >= reach * reach) return null;

    const distance = Math.hypot(dx, dy);
    const depth = reach - distance;

    if (distance < 1e-6) return { nx: 1, ny: 0, depth };
    return { nx: dx / distance, ny: dy / distance, depth };
}

/** Damage and speed loss when the car drives into something solid. */
export function solidImpact(speed: number, heading: number, nx: number, ny: number): SolidImpact {
    const impact = Math.max(0, -speed * (Math.cos(heading) * nx + Math.sin(heading) * ny));
    const damage =
        impact > ARENA.SOLID_DAMAGE_SPEED
            ? (impact - ARENA.SOLID_DAMAGE_SPEED) * ARENA.SOLID_DAMAGE_PER_SPEED
            : 0;

    // A head-on hit bounces the car back; a glancing hit only scrubs some speed.
    const alignment = speed === 0 ? 0 : impact / Math.abs(speed);
    return { impact, damage, speed: speed * (1 - alignment * (1 + ARENA.BOUNCE_KEEP)) };
}

export function canSmash(
    speed: number,
    boosted: boolean,
    minSpeed: number = ARENA.SMASH_MIN_SPEED
): boolean {
    return boosted || speed >= minSpeed;
}

/** Boss waves bring one boss; from wave 3 a growing share of the horde are fast runners. */
export function zombieKind(wave: number, boss: boolean, rng: Rng): ZombieKind {
    if (boss) return 'boss';
    if (wave < ARENA.RUNNER_FIRST_WAVE) return 'walker';

    const chance = Math.min(
        ARENA.RUNNER_CHANCE_MAX,
        (wave - ARENA.RUNNER_FIRST_WAVE + 1) * ARENA.RUNNER_CHANCE_PER_WAVE
    );
    return rng() < chance ? 'runner' : 'walker';
}

export function zombieRadius(kind: ZombieKind): number {
    switch (kind) {
        case 'boss':
            return ARENA.BOSS_RADIUS;
        case 'runner':
            return ARENA.RUNNER_RADIUS;
        case 'walker':
            return ARENA.ZOMBIE_RADIUS;
    }
}

export function zombieSpeed(wave: number, kind: ZombieKind, rng: Rng): number {
    const base = Math.min(
        ARENA.ZOMBIE_SPEED_MAX,
        ARENA.ZOMBIE_SPEED_BASE + ARENA.ZOMBIE_SPEED_PER_WAVE * Math.max(0, wave - 1)
    );
    const jitter = 1 + (rng() * 2 - 1) * ARENA.ZOMBIE_SPEED_JITTER;
    const kindMult =
        kind === 'boss' ? ARENA.BOSS_SPEED_FACTOR : kind === 'runner' ? ARENA.RUNNER_SPEED_MULT : 1;
    return base * jitter * kindMult;
}

/** Hits dealt by one ram: every extra RAM_DAMAGE_STEP of speed above the threshold adds one. */
export function ramDamage(speed: number, minSpeed: number): number {
    const extra = Math.floor(Math.max(0, speed - minSpeed) / ARENA.RAM_DAMAGE_STEP);
    return clamp(1 + extra, 1, ARENA.RAM_DAMAGE_MAX);
}

export interface MutablePoint {
    x: number;
    y: number;
}

/** Moves a zombie one step towards the target in place, so the hot loop allocates nothing. */
export function advanceZombie(
    zombie: MutablePoint,
    target: Point,
    speed: number,
    dtSec: number,
    timeSec: number,
    phase: number
): void {
    const dx = target.x - zombie.x;
    const dy = target.y - zombie.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 1e-6) return;

    const ux = dx / distance;
    const uy = dy / distance;
    const wobble =
        Math.sin(timeSec * TAU * ARENA.ZOMBIE_WOBBLE_HZ + phase) * ARENA.ZOMBIE_WOBBLE_PX_S;

    zombie.x += (ux * speed - uy * wobble) * dtSec;
    zombie.y += (uy * speed + ux * wobble) * dtSec;
}

export function stepZombie(
    zombie: Point,
    target: Point,
    speed: number,
    dtSec: number,
    timeSec: number,
    phase: number
): Point {
    const next: MutablePoint = { x: zombie.x, y: zombie.y };
    advanceZombie(next, target, speed, dtSec, timeSec, phase);
    return next;
}

export function waveZombieCount(wave: number): number {
    return Math.min(ARENA.ZOMBIE_CAP, ARENA.WAVE_BASE_COUNT + ARENA.WAVE_COUNT_PER_WAVE * wave);
}

export function waveHasBoss(wave: number): boolean {
    return wave > 0 && wave % ARENA.BOSS_EVERY_WAVES === 0;
}

export function bossHitPoints(wave: number): number {
    return ARENA.BOSS_BASE_HP + Math.floor(wave / ARENA.BOSS_EVERY_WAVES) - 1;
}

/** Random point on the arena edge that is far enough from the player. */
export function spawnPoint(rng: Rng, player: Point): Point {
    const inset = ARENA.WORLD_MARGIN + ARENA.ZOMBIE_RADIUS;
    let best: Point = { x: inset, y: inset };
    let bestDistance = -1;

    for (let attempt = 0; attempt < ARENA.MAP_PLACE_TRIES; attempt++) {
        const along = rng();
        const edge = Math.floor(rng() * 4);
        const candidate: Point =
            edge === 0
                ? { x: inset + along * (ARENA.WORLD_W - inset * 2), y: inset }
                : edge === 1
                  ? { x: inset + along * (ARENA.WORLD_W - inset * 2), y: ARENA.WORLD_H - inset }
                  : edge === 2
                    ? { x: inset, y: inset + along * (ARENA.WORLD_H - inset * 2) }
                    : { x: ARENA.WORLD_W - inset, y: inset + along * (ARENA.WORLD_H - inset * 2) };

        const distance = Math.hypot(candidate.x - player.x, candidate.y - player.y);
        if (distance >= ARENA.SPAWN_MIN_DISTANCE) return candidate;
        if (distance > bestDistance) {
            best = candidate;
            bestDistance = distance;
        }
    }
    return best;
}

export function crateDrop(rng: Rng): PickupKind | null {
    const roll = rng();
    if (roll < ARENA.CRATE_HEAL_CHANCE) return 'heal';
    if (roll < ARENA.CRATE_HEAL_CHANCE + ARENA.CRATE_NITRO_CHANCE) return 'nitro';
    return null;
}

export function comboMultiplier(combo: number): number {
    return clamp(combo, 1, ARENA.MAX_COMBO_MULT);
}

export function smashPoints(combo: number, kind: ZombieKind): number {
    const base =
        kind === 'boss'
            ? SCORE_VALUES.BOSS_SMASH
            : kind === 'runner'
              ? Math.round(SCORE_VALUES.SMASH * SCORE_VALUES.RUNNER_MULT)
              : SCORE_VALUES.SMASH;
    return base * comboMultiplier(combo);
}

export function isInsideBlast(
    cx: number,
    cy: number,
    x: number,
    y: number,
    radius: number
): boolean {
    return Math.hypot(x - cx, y - cy) <= radius;
}

export function isCarId(value: unknown): value is CarId {
    return CAR_SKINS.some((skin) => skin.id === value);
}

export function isCarUnlocked(id: CarId, bestScore: number): boolean {
    return CAR_SKINS.some((skin) => skin.id === id && bestScore >= skin.unlockScore);
}

export function newlyUnlockedCars(previousBest: number, newBest: number): CarId[] {
    return CAR_SKINS.filter(
        (skin) => previousBest < skin.unlockScore && newBest >= skin.unlockScore
    ).map((skin) => skin.id);
}
