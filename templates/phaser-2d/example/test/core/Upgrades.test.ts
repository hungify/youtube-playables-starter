import { describe, test, expect } from 'bun:test';
import { ARENA, SCRAP, UPGRADES } from '@core/Constants';
import {
    NO_UPGRADES,
    computeStats,
    effectLabel,
    sanitizeLevels,
    scrapEarned,
    upgradeCost,
    type UpgradeLevels
} from '@core/Upgrades';

describe('Upgrades (pure progression rules)', () => {
    test('base stats match the arena constants', () => {
        const stats = computeStats(NO_UPGRADES);
        expect(stats.maxHealth).toBe(ARENA.MAX_HEALTH);
        expect(stats.speedMult).toBe(1);
        expect(stats.smashMinSpeed).toBe(ARENA.SMASH_MIN_SPEED);
        expect(stats.nitroMs).toBe(ARENA.NITRO_MS);
    });

    test('every level makes the car stronger and the smash threshold never drops below the floor', () => {
        let previous = computeStats(NO_UPGRADES);
        for (let level = 1; level <= 5; level++) {
            const levels: UpgradeLevels = { armor: level, engine: level, ram: level, nitro: level };
            const stats = computeStats(levels);
            expect(stats.maxHealth).toBeGreaterThan(previous.maxHealth);
            expect(stats.speedMult).toBeGreaterThan(previous.speedMult);
            expect(stats.smashMinSpeed).toBeLessThan(previous.smashMinSpeed);
            expect(stats.nitroMs).toBeGreaterThan(previous.nitroMs);
            previous = stats;
        }
        expect(computeStats({ armor: 0, engine: 0, ram: 99, nitro: 0 }).smashMinSpeed).toBe(
            SCRAP.MIN_SMASH_SPEED_FLOOR
        );
    });

    test('costs grow with the level and end at max level', () => {
        for (const upgrade of UPGRADES) {
            let last = 0;
            for (let level = 0; level < upgrade.maxLevel; level++) {
                const cost = upgradeCost(upgrade.id, level);
                expect(cost).not.toBeNull();
                expect(cost ?? 0).toBeGreaterThan(last);
                last = cost ?? 0;
            }
            expect(upgradeCost(upgrade.id, upgrade.maxLevel)).toBeNull();
        }
        expect(upgradeCost('armor', 0)).toBe(40);
    });

    test('scrap rewards smashes and waves, never negative', () => {
        expect(scrapEarned(10, 2)).toBe(10 * SCRAP.PER_SMASH + 2 * SCRAP.PER_WAVE);
        expect(scrapEarned(-5, -1)).toBe(0);
    });

    test('cloud save levels are sanitized', () => {
        expect(sanitizeLevels(undefined)).toEqual(NO_UPGRADES);
        expect(sanitizeLevels('nope')).toEqual(NO_UPGRADES);
        expect(
            sanitizeLevels({ armor: 3.9, engine: 99, ram: -2, nitro: Number.NaN, hacked: 5 })
        ).toEqual({ armor: 3, engine: 5, ram: 0, nitro: 0 });
    });

    test('effect labels describe the bonus for a level', () => {
        expect(effectLabel('armor', 0)).toBe('+0 HP');
        expect(effectLabel('armor', 2)).toBe('+40 HP');
        expect(effectLabel('engine', 5)).toBe('+40% SPEED');
        expect(effectLabel('nitro', 3)).toBe('+60% NITRO');
        expect(effectLabel('ram', 1)).toBe(`RAM AT ${ARENA.SMASH_MIN_SPEED - 12}`);
    });
});
