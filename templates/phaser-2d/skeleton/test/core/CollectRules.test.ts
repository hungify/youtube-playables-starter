import { describe, expect, test } from 'bun:test';
import { ARENA, COIN, PLAYER, ROUND } from '@core/Constants';
import {
    clampInput,
    coinPoints,
    isCoinCollected,
    nextCombo,
    placeCoin,
    sanitizeBestScore,
    stepPlayer,
    timeAfterCoin,
    type Body
} from '@core/CollectRules';

const sequence = (values: number[]): (() => number) => {
    let i = 0;
    return () => values[i++ % values.length] ?? 0;
};

describe('CollectRules', () => {
    test('clampInput keeps diagonals at length 1 and leaves small input alone', () => {
        const out = clampInput({ x: 0, y: 0 }, 1, 1);
        expect(Math.hypot(out.x, out.y)).toBeCloseTo(1);
        expect(clampInput(out, 0.3, -0.2)).toEqual({ x: 0.3, y: -0.2 });
    });

    test('stepPlayer accelerates towards the input and never exceeds the speed cap', () => {
        const player: Body = { x: 0, y: 0, vx: 0, vy: 0 };
        stepPlayer(player, 1, 0, 0.016);
        expect(player.vx).toBeGreaterThan(0);
        expect(player.vy).toBe(0);

        for (let i = 0; i < 600; i++) stepPlayer(player, 1, 0, 0.016);
        expect(Math.hypot(player.vx, player.vy)).toBeLessThanOrEqual(PLAYER.MAX_SPEED + 1e-9);
    });

    test('stepPlayer drag slows a coasting player', () => {
        const player: Body = { x: 0, y: 0, vx: 50, vy: 0 };
        stepPlayer(player, 0, 0, 0.5);
        expect(player.vx).toBeLessThan(50);
        expect(player.vx).toBeGreaterThan(0);
    });

    test('stepPlayer keeps the player on the arena and bounces it inwards', () => {
        const limit = ARENA.RADIUS - PLAYER.RADIUS;
        const player: Body = { x: limit - 0.01, y: 0, vx: PLAYER.MAX_SPEED, vy: 0 };
        stepPlayer(player, 1, 0, 0.05);
        expect(Math.hypot(player.x, player.y)).toBeCloseTo(limit);
        expect(player.vx).toBeLessThan(0);
    });

    test('isCoinCollected uses the summed radii', () => {
        const reach = PLAYER.RADIUS + COIN.RADIUS;
        expect(isCoinCollected({ x: 0, y: 0 }, { x: reach - 0.01, y: 0 })).toBe(true);
        expect(isCoinCollected({ x: 0, y: 0 }, { x: reach + 0.01, y: 0 })).toBe(false);
    });

    test('placeCoin stays inside the arena and away from the player', () => {
        const rng = sequence([0.13, 0.71, 0.42, 0.05, 0.93, 0.66, 0.28, 0.51]);
        const coin = { x: 0, y: 0 };
        for (let i = 0; i < 50; i++) {
            const player = { x: (i % 7) * 40 - 120, y: (i % 5) * 40 - 80 };
            placeCoin(coin, player, rng);
            expect(Math.hypot(coin.x, coin.y)).toBeLessThanOrEqual(ARENA.RADIUS - COIN.EDGE_MARGIN);
            expect(Math.hypot(coin.x - player.x, coin.y - player.y)).toBeGreaterThanOrEqual(
                COIN.MIN_SPAWN_DISTANCE
            );
        }
    });

    test('placeCoin falls back to the far side when every roll lands on the player', () => {
        const coin = placeCoin({ x: 0, y: 0 }, { x: 100, y: 0 }, () => 0);
        expect(coin.x).toBeCloseTo(-(ARENA.RADIUS - COIN.EDGE_MARGIN));
        expect(coin.y).toBeCloseTo(0);
    });

    test('combo grows inside the window, caps, and resets after it', () => {
        expect(nextCombo(0, Number.POSITIVE_INFINITY)).toBe(1);
        expect(nextCombo(1, ROUND.COMBO_WINDOW_MS)).toBe(2);
        expect(nextCombo(ROUND.MAX_COMBO, 10)).toBe(ROUND.MAX_COMBO);
        expect(nextCombo(4, ROUND.COMBO_WINDOW_MS + 1)).toBe(1);
        expect(coinPoints(3)).toBe(ROUND.COIN_POINTS * 3);
    });

    test('time bonus is capped and best scores are sanitized', () => {
        expect(timeAfterCoin(1000)).toBe(1000 + ROUND.COIN_TIME_BONUS_MS);
        expect(timeAfterCoin(ROUND.MAX_TIME_MS)).toBe(ROUND.MAX_TIME_MS);
        expect(sanitizeBestScore(42.9)).toBe(42);
        expect(sanitizeBestScore(-1)).toBeNull();
        expect(sanitizeBestScore(Number.NaN)).toBeNull();
        expect(sanitizeBestScore('100')).toBeNull();
    });
});
