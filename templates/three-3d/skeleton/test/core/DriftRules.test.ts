import { describe, expect, test } from 'bun:test';
import { ARENA, GEM, ORB, ROUND } from '@core/Constants';
import {
    clampInput,
    gemPoints,
    isGemCollected,
    nextCombo,
    placeGem,
    sanitizeBestScore,
    stepOrb,
    timeAfterGem,
    type Body
} from '@core/DriftRules';

const sequence = (values: number[]): (() => number) => {
    let i = 0;
    return () => values[i++ % values.length] ?? 0;
};

describe('DriftRules', () => {
    test('clampInput keeps diagonals at length 1 and leaves small input alone', () => {
        const out = clampInput({ x: 0, z: 0 }, 1, 1);
        expect(Math.hypot(out.x, out.z)).toBeCloseTo(1);
        expect(clampInput(out, 0.3, -0.2)).toEqual({ x: 0.3, z: -0.2 });
    });

    test('stepOrb accelerates towards the input and never exceeds the speed cap', () => {
        const orb: Body = { x: 0, z: 0, vx: 0, vz: 0 };
        stepOrb(orb, 1, 0, 0.016);
        expect(orb.vx).toBeGreaterThan(0);
        expect(orb.vz).toBe(0);

        for (let i = 0; i < 600; i++) stepOrb(orb, 1, 0, 0.016);
        expect(Math.hypot(orb.vx, orb.vz)).toBeLessThanOrEqual(ORB.MAX_SPEED + 1e-9);
    });

    test('stepOrb drag slows a coasting orb', () => {
        const orb: Body = { x: 0, z: 0, vx: 5, vz: 0 };
        stepOrb(orb, 0, 0, 0.5);
        expect(orb.vx).toBeLessThan(5);
        expect(orb.vx).toBeGreaterThan(0);
    });

    test('stepOrb keeps the orb on the arena and bounces it inwards', () => {
        const limit = ARENA.RADIUS - ORB.RADIUS;
        const orb: Body = { x: limit - 0.01, z: 0, vx: ORB.MAX_SPEED, vz: 0 };
        stepOrb(orb, 1, 0, 0.05);
        expect(Math.hypot(orb.x, orb.z)).toBeCloseTo(limit);
        expect(orb.vx).toBeLessThan(0);
    });

    test('isGemCollected uses the summed radii', () => {
        const reach = ORB.RADIUS + GEM.RADIUS;
        expect(isGemCollected({ x: 0, z: 0 }, { x: reach - 0.01, z: 0 })).toBe(true);
        expect(isGemCollected({ x: 0, z: 0 }, { x: reach + 0.01, z: 0 })).toBe(false);
    });

    test('placeGem stays inside the arena and away from the orb', () => {
        const rng = sequence([0.13, 0.71, 0.42, 0.05, 0.93, 0.66, 0.28, 0.51]);
        const gem = { x: 0, z: 0 };
        for (let i = 0; i < 50; i++) {
            const orb = { x: (i % 7) - 3, z: (i % 5) - 2 };
            placeGem(gem, orb, rng);
            expect(Math.hypot(gem.x, gem.z)).toBeLessThanOrEqual(ARENA.RADIUS - GEM.EDGE_MARGIN);
            expect(Math.hypot(gem.x - orb.x, gem.z - orb.z)).toBeGreaterThanOrEqual(
                GEM.MIN_SPAWN_DISTANCE
            );
        }
    });

    test('placeGem falls back to the far side when every roll lands on the orb', () => {
        const gem = placeGem({ x: 0, z: 0 }, { x: 3, z: 0 }, () => 0);
        expect(gem.x).toBeCloseTo(-(ARENA.RADIUS - GEM.EDGE_MARGIN));
        expect(gem.z).toBeCloseTo(0);
    });

    test('combo grows inside the window, caps, and resets after it', () => {
        expect(nextCombo(0, Number.POSITIVE_INFINITY)).toBe(1);
        expect(nextCombo(1, ROUND.COMBO_WINDOW_MS)).toBe(2);
        expect(nextCombo(ROUND.MAX_COMBO, 10)).toBe(ROUND.MAX_COMBO);
        expect(nextCombo(4, ROUND.COMBO_WINDOW_MS + 1)).toBe(1);
        expect(gemPoints(3)).toBe(ROUND.GEM_POINTS * 3);
    });

    test('time bonus is capped and best scores are sanitized', () => {
        expect(timeAfterGem(1000)).toBe(1000 + ROUND.GEM_TIME_BONUS_MS);
        expect(timeAfterGem(ROUND.MAX_TIME_MS)).toBe(ROUND.MAX_TIME_MS);
        expect(sanitizeBestScore(42.9)).toBe(42);
        expect(sanitizeBestScore(-1)).toBeNull();
        expect(sanitizeBestScore(Number.NaN)).toBeNull();
        expect(sanitizeBestScore('100')).toBeNull();
    });
});
