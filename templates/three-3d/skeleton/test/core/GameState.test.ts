import { beforeEach, describe, expect, test } from 'bun:test';
import { GEM, ORB, ROUND, SCREENS } from '@core/Constants';
import { EventBus, Events } from '@core/EventBus';
import { gameState } from '@core/GameState';

const rng = (): number => 0.5;

/** Puts the gem right next to the orb so the next tick collects it. */
function gemUnderOrb(): void {
    gameState.gem.x = gameState.orb.x + (ORB.RADIUS + GEM.RADIUS) / 2;
    gameState.gem.z = gameState.orb.z;
}

describe('GameState & EventBus integration', () => {
    beforeEach(() => {
        EventBus.clear();
        gameState.resetAll();
    });

    test('hydrates the cloud save and ignores invalid values', () => {
        gameState.hydrate({ bestScore: 320 });
        expect(gameState.bestScore).toBe(320);
        gameState.hydrate({ bestScore: Number.NaN });
        gameState.hydrate(undefined);
        expect(gameState.toSaveData()).toEqual({ bestScore: 320 });
    });

    test('a run collects gems with a combo, extends time and emits typed events', () => {
        const log: string[] = [];
        EventBus.on(Events.SCREEN_CHANGED, ({ screen }) => log.push(`screen:${screen}`));
        EventBus.on(Events.GEM_COLLECTED, ({ points, combo }) =>
            log.push(`gem:${points}:${combo}`)
        );

        gameState.startRun(rng);
        expect(gameState.screen).toBe(SCREENS.GAME);

        gemUnderOrb();
        gameState.tick(16, 0, 0, rng);
        gemUnderOrb();
        gameState.tick(16, 0, 0, rng);

        expect(gameState.score).toBe(ROUND.GEM_POINTS * 3);
        expect(gameState.combo).toBe(2);
        expect(gameState.timeLeftMs).toBeGreaterThan(ROUND.DURATION_MS);
        expect(log).toEqual([
            `screen:${SCREENS.GAME}`,
            `gem:${ROUND.GEM_POINTS}:1`,
            `gem:${ROUND.GEM_POINTS * 2}:2`
        ]);
    });

    test('the timer ends the run once, records a new best and freezes the state', () => {
        let overs = 0;
        EventBus.on(Events.GAME_OVER, () => overs++);
        gameState.hydrate({ bestScore: 5 });
        gameState.startRun(rng);
        gemUnderOrb();
        gameState.tick(16, 0, 0, rng);

        gameState.tick(ROUND.MAX_TIME_MS, 1, 0, rng);
        gameState.tick(16, 1, 0, rng);

        expect(overs).toBe(1);
        expect(gameState.gameOver).toBe(true);
        expect(gameState.newBest).toBe(true);
        expect(gameState.bestScore).toBe(ROUND.GEM_POINTS);
        expect(gameState.screen).toBe(SCREENS.GAME_OVER);
    });

    test('paused runs do not advance, and three restarts start clean', () => {
        gameState.startRun(rng);
        gameState.paused = true;
        gameState.tick(1000, 1, 0, rng);
        expect(gameState.timeLeftMs).toBe(ROUND.DURATION_MS);
        gameState.paused = false;

        for (let i = 0; i < 3; i++) {
            gameState.tick(500, 1, 0, rng);
            gameState.endRun();
            gameState.startRun(rng);
            expect(gameState.score).toBe(0);
            expect(gameState.timeLeftMs).toBe(ROUND.DURATION_MS);
            expect(gameState.orb).toEqual({ x: 0, z: 0, vx: 0, vz: 0 });
            expect(gameState.gameOver).toBe(false);
        }
    });
});
