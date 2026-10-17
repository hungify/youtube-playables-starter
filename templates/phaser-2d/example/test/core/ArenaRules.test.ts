import { describe, test, expect } from 'bun:test';
import { ARENA, SCORE_VALUES } from '@core/Constants';
import {
    bossHitPoints,
    canSmash,
    advanceZombie,
    circleOverlap,
    crateDrop,
    findFreeSpot,
    generateMap,
    isCarUnlocked,
    isInsideBlast,
    isSolid,
    newlyUnlockedCars,
    ramDamage,
    zombieKind,
    zombieRadius,
    requiredGap,
    smashPoints,
    solidImpact,
    spawnPoint,
    stepVehicle,
    stepZombie,
    turnCommand,
    waveHasBoss,
    waveZombieCount,
    wantsThrottle,
    wrapAngle,
    zombieSpeed,
    type Rng,
    type Vehicle
} from '@core/ArenaRules';

function seededRng(seed: number): Rng {
    let state = seed;
    return () => {
        state = (state * 1664525 + 1013904223) % 4294967296;
        return state / 4294967296;
    };
}

const middle: Rng = () => 0.5;
const always: Rng = () => 0;
const never: Rng = () => 0.99;
const idle = { turn: 0, throttle: false, brake: false } as const;
const gas = { turn: 0, throttle: true, brake: false } as const;
const circling = { turn: 1, throttle: true, brake: false } as const;
const start: Vehicle = { x: 750, y: 750, heading: 0, speed: 0 };

describe('ArenaRules: vehicle', () => {
    test('accelerates up to the top speed and boost raises the cap', () => {
        // Circling keeps the car away from the walls while the speed settles.
        let car = start;
        for (let i = 0; i < 300; i++) car = stepVehicle(car, circling, 1 / 60, false);
        expect(car.speed).toBeCloseTo(ARENA.MAX_SPEED, 5);

        for (let i = 0; i < 300; i++) car = stepVehicle(car, circling, 1 / 60, true);
        expect(car.speed).toBeCloseTo(ARENA.MAX_SPEED * ARENA.BOOST_SPEED_MULT, 5);

        for (let i = 0; i < 300; i++) car = stepVehicle(car, circling, 1 / 60, false);
        expect(car.speed).toBeCloseTo(ARENA.MAX_SPEED, 5);
    });

    test('coasting and braking slow the car down to a stop', () => {
        const rolling: Vehicle = { ...start, speed: 400 };
        const coasted = stepVehicle(rolling, idle, 0.5, false);
        const braked = stepVehicle(rolling, { ...idle, brake: true }, 0.5, false);
        expect(coasted.speed).toBeLessThan(400);
        expect(braked.speed).toBeLessThan(coasted.speed);
        expect(stepVehicle({ ...start, speed: 5 }, idle, 1, false).speed).toBe(0);
    });

    test('can reverse with the brake and rolls back to a stop', () => {
        let car: Vehicle = { ...start, speed: 0 };
        for (let i = 0; i < 120; i++) {
            car = stepVehicle(car, { ...idle, brake: true }, 1 / 60, false);
        }
        expect(car.speed).toBeCloseTo(-ARENA.REVERSE_MAX_SPEED, 5);
        expect(car.x).toBeLessThan(start.x);

        for (let i = 0; i < 120; i++) car = stepVehicle(car, idle, 1 / 60, false);
        expect(car.speed).toBe(0);
    });

    test('turns only as fast as the turn rate and slower when crawling', () => {
        const fast = stepVehicle({ ...start, speed: 300 }, { ...gas, turn: 1 }, 0.1, false);
        const slow = stepVehicle({ ...start, speed: 0 }, { ...gas, turn: 1 }, 0.1, false);
        expect(fast.heading).toBeGreaterThan(slow.heading);
        expect(fast.heading).toBeLessThanOrEqual(ARENA.TURN_RATE * 0.1 + 1e-9);
        expect(slow.heading).toBeGreaterThan(0);
    });

    test('turnCommand points at the target and saturates', () => {
        const car: Vehicle = { ...start, heading: 0, speed: 300 };
        expect(turnCommand(car, 1000, 750, 1 / 60)).toBeCloseTo(0, 5);
        expect(turnCommand(car, 750, 1500, 1 / 60)).toBe(1);
        expect(turnCommand(car, 750, 0, 1 / 60)).toBe(-1);
        expect(wrapAngle(Math.PI * 2.5)).toBeCloseTo(Math.PI / 2, 5);
        expect(wrapAngle(-Math.PI * 2.5)).toBeCloseTo(-Math.PI / 2, 5);

        expect(wantsThrottle(car, 760, 750)).toBe(false);
        expect(wantsThrottle(car, 1000, 750)).toBe(true);
    });

    test('walls keep the car inside the map and bleed speed', () => {
        const nearWall: Vehicle = { x: ARENA.WORLD_W - 40, y: 750, heading: 0, speed: 500 };
        const next = stepVehicle(nearWall, gas, 0.2, false);
        expect(next.hitWall).toBe(true);
        expect(next.x).toBeLessThanOrEqual(
            ARENA.WORLD_W - ARENA.WORLD_MARGIN - ARENA.PLAYER_RADIUS
        );
        expect(next.speed).toBeLessThan(500);
    });
});

describe('ArenaRules: collisions and impacts', () => {
    test('circle overlap returns a push-out normal', () => {
        expect(circleOverlap(0, 0, 10, 30, 0, 10)).toBeNull();
        const hit = circleOverlap(0, 0, 10, 15, 0, 10);
        expect(hit).not.toBeNull();
        expect(hit?.depth).toBeCloseTo(5, 5);
        expect(hit?.nx).toBeCloseTo(-1, 5);
        expect(circleOverlap(5, 5, 4, 5, 5, 4)?.depth).toBe(8);
    });

    test('driving into a solid hurts only above the damage speed', () => {
        const head = solidImpact(500, 0, -1, 0);
        expect(head.damage).toBeCloseTo(
            (500 - ARENA.SOLID_DAMAGE_SPEED) * ARENA.SOLID_DAMAGE_PER_SPEED,
            5
        );
        expect(head.speed).toBeCloseTo(-500 * ARENA.BOUNCE_KEEP, 5);

        const glancing = solidImpact(500, 0, -Math.SQRT1_2, Math.SQRT1_2);
        expect(glancing.speed).toBeGreaterThan(0);
        expect(glancing.speed).toBeLessThan(500);

        expect(solidImpact(200, 0, -1, 0).damage).toBe(0);
        expect(solidImpact(500, 0, 1, 0).impact).toBe(0);
        expect(solidImpact(500, 0, 0, 1).damage).toBe(0);
    });

    test('only a fast or boosted car smashes zombies', () => {
        expect(canSmash(ARENA.SMASH_MIN_SPEED - 1, false)).toBe(false);
        expect(canSmash(ARENA.SMASH_MIN_SPEED, false)).toBe(true);
        expect(canSmash(0, true)).toBe(true);
    });

    test('blast radius includes its edge only', () => {
        expect(isInsideBlast(0, 0, 100, 0, ARENA.BLAST_RADIUS)).toBe(true);
        expect(isInsideBlast(0, 0, ARENA.BLAST_RADIUS + 1, 0, ARENA.BLAST_RADIUS)).toBe(false);
    });
});

describe('ArenaRules: map generation', () => {
    test('places every object with drivable gaps and a clear start', () => {
        for (let seed = 1; seed <= 20; seed++) {
            const objects = generateMap(seededRng(seed));
            expect(objects.length).toBeGreaterThanOrEqual(30);

            for (const object of objects) {
                expect(object.x).toBeGreaterThanOrEqual(ARENA.MAP_MARGIN);
                expect(object.x).toBeLessThanOrEqual(ARENA.WORLD_W - ARENA.MAP_MARGIN);
                expect(object.y).toBeGreaterThanOrEqual(ARENA.MAP_MARGIN);
                expect(object.y).toBeLessThanOrEqual(ARENA.WORLD_H - ARENA.MAP_MARGIN);
                expect(
                    Math.hypot(object.x - ARENA.PLAYER_START_X, object.y - ARENA.PLAYER_START_Y)
                ).toBeGreaterThanOrEqual(ARENA.START_CLEAR_RADIUS);
            }

            objects.forEach((a, i) => {
                for (const b of objects.slice(i + 1)) {
                    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(
                        a.radius + b.radius + requiredGap(a.kind, b.kind)
                    );
                }
            });
        }
    });

    test('is deterministic, has every kind, and solid kinds are classified', () => {
        const a = generateMap(seededRng(5));
        const b = generateMap(seededRng(5));
        expect(a).toEqual(b);

        const kinds = new Set(a.map((object) => object.kind));
        for (const kind of ['tree', 'rock', 'wreck', 'crate', 'barrel'] as const) {
            expect(kinds.has(kind)).toBe(true);
        }
        expect(isSolid('tree')).toBe(true);
        expect(isSolid('crate')).toBe(false);
        expect(isSolid('barrel')).toBe(false);
    });

    test('free spots avoid every object', () => {
        const objects = generateMap(seededRng(9));
        const rng = seededRng(2);
        for (let i = 0; i < 30; i++) {
            const spot = findFreeSpot(rng, objects, ARENA.PICKUP_RADIUS);
            if (!spot) continue;
            for (const object of objects) {
                expect(Math.hypot(spot.x - object.x, spot.y - object.y)).toBeGreaterThan(
                    ARENA.PICKUP_RADIUS + object.radius
                );
            }
        }
    });
});

describe('ArenaRules: zombies and waves', () => {
    test('waves grow, cap out and bring a boss every few waves', () => {
        expect(waveZombieCount(1)).toBe(ARENA.WAVE_BASE_COUNT + ARENA.WAVE_COUNT_PER_WAVE);
        expect(waveZombieCount(999)).toBe(ARENA.ZOMBIE_CAP);
        expect(waveHasBoss(4)).toBe(false);
        expect(waveHasBoss(5)).toBe(true);
        expect(waveHasBoss(10)).toBe(true);
        expect(waveHasBoss(0)).toBe(false);
        expect(bossHitPoints(5)).toBe(ARENA.BOSS_BASE_HP);
        expect(bossHitPoints(10)).toBe(ARENA.BOSS_BASE_HP + 1);
    });

    test('zombies speed up per wave, bosses are slower, and the speed is capped', () => {
        expect(zombieSpeed(1, 'walker', middle)).toBe(ARENA.ZOMBIE_SPEED_BASE);
        expect(zombieSpeed(5, 'walker', middle)).toBeGreaterThan(zombieSpeed(1, 'walker', middle));
        expect(zombieSpeed(999, 'walker', middle)).toBe(ARENA.ZOMBIE_SPEED_MAX);
        expect(zombieSpeed(5, 'boss', middle)).toBeLessThan(zombieSpeed(5, 'walker', middle));
        expect(zombieSpeed(5, 'runner', middle)).toBeGreaterThan(zombieSpeed(5, 'walker', middle));
    });

    test('zombies walk towards the target', () => {
        let zombie = { x: 0, y: 0 };
        const target = { x: 400, y: 0 };
        for (let i = 0; i < 120; i++) {
            zombie = stepZombie(zombie, target, 100, 1 / 60, i / 60, 0);
        }
        expect(Math.hypot(target.x - zombie.x, target.y - zombie.y)).toBeLessThan(400 - 150);
        expect(stepZombie(target, target, 100, 1, 0, 0)).toEqual(target);
    });

    test('spawn points sit on the edge and far from the player', () => {
        const rng = seededRng(4);
        const player = { x: ARENA.PLAYER_START_X, y: ARENA.PLAYER_START_Y };
        for (let i = 0; i < 100; i++) {
            const point = spawnPoint(rng, player);
            const onEdge =
                point.x <= ARENA.WORLD_MARGIN + ARENA.ZOMBIE_RADIUS + 1 ||
                point.y <= ARENA.WORLD_MARGIN + ARENA.ZOMBIE_RADIUS + 1 ||
                point.x >= ARENA.WORLD_W - ARENA.WORLD_MARGIN - ARENA.ZOMBIE_RADIUS - 1 ||
                point.y >= ARENA.WORLD_H - ARENA.WORLD_MARGIN - ARENA.ZOMBIE_RADIUS - 1;
            expect(onEdge).toBe(true);
            expect(Math.hypot(point.x - player.x, point.y - player.y)).toBeGreaterThanOrEqual(
                ARENA.SPAWN_MIN_DISTANCE
            );
        }
    });
});

describe('ArenaRules: scoring and unlocks', () => {
    test('combo multiplier caps and bosses are worth more', () => {
        expect(smashPoints(1, 'walker')).toBe(SCORE_VALUES.SMASH);
        expect(smashPoints(3, 'walker')).toBe(SCORE_VALUES.SMASH * 3);
        expect(smashPoints(99, 'walker')).toBe(SCORE_VALUES.SMASH * ARENA.MAX_COMBO_MULT);
        expect(smashPoints(1, 'boss')).toBe(SCORE_VALUES.BOSS_SMASH);
        expect(smashPoints(1, 'runner')).toBe(
            Math.round(SCORE_VALUES.SMASH * SCORE_VALUES.RUNNER_MULT)
        );
    });

    test('crate drops follow the configured odds', () => {
        expect(crateDrop(() => 0)).toBe('heal');
        expect(crateDrop(() => ARENA.CRATE_HEAL_CHANCE + 0.01)).toBe('nitro');
        expect(crateDrop(() => 0.99)).toBeNull();
    });

    test('cars unlock by best score', () => {
        expect(isCarUnlocked('car1', 0)).toBe(true);
        expect(isCarUnlocked('car2', 1499)).toBe(false);
        expect(isCarUnlocked('car2', 1500)).toBe(true);
        expect(newlyUnlockedCars(1400, 4100)).toEqual(['car2', 'car3']);
        expect(newlyUnlockedCars(4100, 4200)).toEqual([]);
    });
});

describe('ArenaRules: zombie variety and ram damage', () => {
    test('runners only appear from the configured wave and never on boss spawns', () => {
        expect(zombieKind(ARENA.RUNNER_FIRST_WAVE - 1, false, always)).toBe('walker');
        expect(zombieKind(ARENA.RUNNER_FIRST_WAVE, false, always)).toBe('runner');
        expect(zombieKind(ARENA.RUNNER_FIRST_WAVE, false, never)).toBe('walker');
        expect(zombieKind(10, true, always)).toBe('boss');

        const rng = seededRng(11);
        let runners = 0;
        for (let i = 0; i < 1000; i++) {
            if (zombieKind(99, false, rng) === 'runner') runners += 1;
        }
        expect(runners / 1000).toBeGreaterThan(ARENA.RUNNER_CHANCE_MAX - 0.07);
        expect(runners / 1000).toBeLessThan(ARENA.RUNNER_CHANCE_MAX + 0.07);
    });

    test('kinds have distinct sizes', () => {
        expect(zombieRadius('runner')).toBeLessThan(zombieRadius('walker'));
        expect(zombieRadius('boss')).toBeGreaterThan(zombieRadius('walker'));
    });

    test('faster rams hit harder, capped at the maximum', () => {
        const min = ARENA.SMASH_MIN_SPEED;
        expect(ramDamage(min, min)).toBe(1);
        expect(ramDamage(min + ARENA.RAM_DAMAGE_STEP - 1, min)).toBe(1);
        expect(ramDamage(min + ARENA.RAM_DAMAGE_STEP, min)).toBe(2);
        expect(ramDamage(min + ARENA.RAM_DAMAGE_STEP * 5, min)).toBe(ARENA.RAM_DAMAGE_MAX);
        expect(ramDamage(0, min)).toBe(1);
    });
});

describe('ArenaRules: hot-path helpers', () => {
    test('advanceZombie moves in place and matches the pure stepZombie', () => {
        const target = { x: 500, y: 300 };
        const pure = stepZombie({ x: 100, y: 100 }, target, 90, 1 / 60, 2, 0.4);

        const zombie = { x: 100, y: 100 };
        advanceZombie(zombie, target, 90, 1 / 60, 2, 0.4);
        expect(zombie.x).toBeCloseTo(pure.x, 10);
        expect(zombie.y).toBeCloseTo(pure.y, 10);

        const arrived = { x: 500, y: 300 };
        advanceZombie(arrived, target, 90, 1, 0, 0);
        expect(arrived).toEqual({ x: 500, y: 300 });
    });

    test('circle overlap early-out agrees with the exact distance test', () => {
        const rng = seededRng(21);
        for (let i = 0; i < 2000; i++) {
            const ax = rng() * 200;
            const ay = rng() * 200;
            const bx = rng() * 200;
            const by = rng() * 200;
            const ar = 5 + rng() * 40;
            const br = 5 + rng() * 40;
            const exact = Math.hypot(ax - bx, ay - by) < ar + br;
            expect(circleOverlap(ax, ay, ar, bx, by, br) !== null).toBe(exact);
        }
    });

    test('the zombie cap never exceeds the pool, so a wave can always finish spawning', () => {
        expect(ARENA.ZOMBIE_CAP).toBeLessThanOrEqual(ARENA.ZOMBIE_POOL_SIZE);
        expect(waveZombieCount(999)).toBeLessThanOrEqual(ARENA.ZOMBIE_POOL_SIZE);
    });
});
