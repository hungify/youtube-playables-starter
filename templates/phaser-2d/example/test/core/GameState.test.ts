import { describe, test, expect, beforeEach } from 'bun:test';
import { ARENA, SCORE_VALUES, SCRAP } from '@core/Constants';
import { EventBus, Events } from '@core/EventBus';
import { gameState } from '@core/GameState';

describe('GameState & EventBus integration', () => {
    beforeEach(() => {
        EventBus.clear();
        gameState.resetAll();
    });

    test('hydrates cloud save data and rejects locked or invalid cars', () => {
        gameState.hydrate({ activeCar: 'car3', bestScore: 4200 });
        expect(gameState.bestScore).toBe(4200);
        expect(gameState.activeCar).toBe('car3');
        expect(gameState.isCarUnlocked('car3')).toBe(true);
        expect(gameState.isCarUnlocked('car4')).toBe(false);

        expect(gameState.selectCar('car5')).toBe('car3');
        expect(gameState.selectCar('car2')).toBe('car2');

        gameState.resetAll();
        gameState.hydrate({ activeCar: 'car5', bestScore: 10 });
        expect(gameState.activeCar).toBe('car1');

        gameState.hydrate({ activeCar: 'nope', bestScore: Number.NaN });
        expect(gameState.bestScore).toBe(10);
        expect(gameState.toSaveData()).toEqual({
            activeCar: 'car1',
            bestScore: 10,
            scrap: 0,
            upgrades: { armor: 0, engine: 0, ram: 0, nitro: 0 },
            haptics: true
        });
    });

    test('kills score with a growing combo and emit typed events', () => {
        const events: string[] = [];
        EventBus.on(Events.SPECTACLE_HIT, ({ kind, points }) =>
            events.push(`hit:${kind}:${points}`)
        );
        EventBus.on(Events.SPECTACLE_COMBO, ({ combo }) => events.push(`combo:${combo}`));
        EventBus.on(Events.SPECTACLE_STREAK, ({ streak }) => events.push(`streak:${streak}`));
        EventBus.on(Events.WAVE_CHANGED, ({ wave, remaining }) =>
            events.push(`wave:${wave}:${remaining}`)
        );

        gameState.resetSession();
        gameState.startWave(1, 10);
        for (let i = 0; i < 5; i++) gameState.registerKill('walker');

        expect(gameState.smashes).toBe(5);
        expect(gameState.remaining).toBe(5);
        expect(gameState.score).toBe(30 + 60 + 90 + 120 + 150);
        expect(events).toContain('wave:1:10');
        expect(events).toContain('hit:smash:30');
        expect(events).toContain('hit:smash:150');
        expect(events).toContain('combo:2');
        expect(events).toContain('streak:5');

        expect(gameState.registerKill('boss')).toBe(SCORE_VALUES.BOSS_SMASH * ARENA.MAX_COMBO_MULT);
        expect(events).toContain(`hit:boss:${SCORE_VALUES.BOSS_SMASH * ARENA.MAX_COMBO_MULT}`);
    });

    test('combo expires after the window and a crash resets it', () => {
        gameState.resetSession();
        gameState.startWave(1, 5);
        gameState.registerKill('walker');
        expect(gameState.combo).toBe(1);
        gameState.advance(ARENA.COMBO_WINDOW_MS + 100);
        expect(gameState.combo).toBe(0);

        gameState.registerKill('walker');
        gameState.registerKill('walker');
        expect(gameState.combo).toBe(2);
        gameState.takeDamage(10, true);
        expect(gameState.combo).toBe(0);
        expect(gameState.health).toBe(ARENA.MAX_HEALTH - 10);
    });

    test('bites hurt without resetting the combo, and health never drops below zero', () => {
        gameState.resetSession();
        gameState.startWave(1, 3);
        gameState.registerKill('walker');
        expect(gameState.takeDamage(5, false)).toBe(false);
        expect(gameState.combo).toBe(1);

        expect(gameState.takeDamage(0, true)).toBe(false);
        expect(gameState.takeDamage(1000, true)).toBe(true);
        expect(gameState.health).toBe(0);
    });

    test('pickups heal up to the cap and start the nitro boost', () => {
        const health: number[] = [];
        EventBus.on(Events.HEALTH_CHANGED, ({ health: value }) => health.push(value));

        gameState.resetSession();
        gameState.takeDamage(50, false);
        gameState.collectPickup('heal');
        expect(gameState.health).toBe(50 + ARENA.HEAL_AMOUNT);
        gameState.collectPickup('heal');
        gameState.collectPickup('heal');
        expect(gameState.health).toBe(ARENA.MAX_HEALTH);
        expect(health.at(-1)).toBe(ARENA.MAX_HEALTH);

        expect(gameState.isBoosted()).toBe(false);
        gameState.collectPickup('nitro');
        expect(gameState.isBoosted()).toBe(true);
        gameState.advance(ARENA.NITRO_MS + 1);
        expect(gameState.isBoosted()).toBe(false);
        expect(gameState.score).toBe(SCORE_VALUES.PICKUP * 4);
    });

    test('wave clear pays a bonus scaled by the wave number', () => {
        gameState.resetSession();
        gameState.startWave(3, 1);
        expect(gameState.clearWave()).toBe(SCORE_VALUES.WAVE_CLEAR * 3);
        expect(gameState.score).toBe(SCORE_VALUES.WAVE_CLEAR * 3);

        // A wave cleared for free (revive blast) pays nothing.
        expect(gameState.clearWave(false)).toBe(0);
        expect(gameState.score).toBe(SCORE_VALUES.WAVE_CLEAR * 3);
    });

    test('revive repairs the car once per run and only after it is destroyed', () => {
        gameState.resetSession();
        expect(gameState.canRevive()).toBe(false);
        expect(gameState.revive()).toBe(false);

        gameState.takeDamage(1000, true);
        expect(gameState.canRevive()).toBe(true);
        expect(gameState.revive()).toBe(true);
        expect(gameState.health).toBe(ARENA.REVIVE_HEALTH);

        gameState.takeDamage(1000, true);
        expect(gameState.canRevive()).toBe(false);
        expect(gameState.revive()).toBe(false);

        gameState.resetSession();
        expect(gameState.reviveUsed).toBe(false);
    });

    test('announces unlocked cars once as the best score grows', () => {
        const unlocked: string[] = [];
        EventBus.on(Events.CAR_UNLOCKED, ({ car }) => unlocked.push(car));

        gameState.resetSession();
        gameState.startWave(1, 1000);
        while (gameState.bestScore < 4000) gameState.registerKill('boss');
        gameState.registerKill('boss');
        expect(unlocked).toEqual(['car2', 'car3']);
    });

    test('3x restart leaves a clean session and keeps best score', () => {
        for (let run = 0; run < 3; run++) {
            gameState.resetSession();
            expect(gameState.score).toBe(0);
            expect(gameState.health).toBe(ARENA.MAX_HEALTH);
            expect(gameState.wave).toBe(0);
            expect(gameState.combo).toBe(0);
            gameState.startWave(1, 2);
            gameState.registerKill('walker');
            gameState.finishGame();
            expect(gameState.gameOver).toBe(true);
        }
        expect(gameState.bestScore).toBe(SCORE_VALUES.SMASH);
    });

    test('finishing a run banks scrap, which persists in the save data', () => {
        gameState.resetSession();
        gameState.startWave(3, 5);
        gameState.registerKill('walker');
        gameState.registerKill('walker');
        gameState.finishGame();

        const earned = 2 * SCRAP.PER_SMASH + 3 * SCRAP.PER_WAVE;
        expect(gameState.scrapEarnedLastRun).toBe(earned);
        expect(gameState.scrap).toBe(earned);
        expect(gameState.toSaveData().scrap).toBe(earned);

        gameState.resetAll();
        gameState.hydrate({ scrap: 120.9, upgrades: { armor: 2, engine: 99, hacked: 7 } });
        expect(gameState.scrap).toBe(120);
        expect(gameState.upgrades).toEqual({ armor: 2, engine: 5, ram: 0, nitro: 0 });
        expect(gameState.stats.maxHealth).toBe(ARENA.MAX_HEALTH + 40);
    });

    test('buying upgrades spends scrap, raises stats and refuses when broke or maxed', () => {
        const bought: string[] = [];
        EventBus.on(Events.UPGRADE_BOUGHT, ({ id, level, scrap }) =>
            bought.push(`${id}:${level}:${scrap}`)
        );

        gameState.resetAll();
        expect(gameState.buyUpgrade('armor')).toBe(false);

        gameState.scrap = 500;
        expect(gameState.buyUpgrade('armor')).toBe(true);
        expect(gameState.upgrades.armor).toBe(1);
        expect(gameState.scrap).toBe(460);
        expect(bought).toEqual(['armor:1:460']);

        gameState.resetSession();
        expect(gameState.health).toBe(ARENA.MAX_HEALTH + 20);

        gameState.scrap = 1_000_000;
        while (gameState.buyUpgrade('nitro')) {
            // buy until maxed
        }
        expect(gameState.upgrades.nitro).toBe(5);
        expect(gameState.buyUpgrade('nitro')).toBe(false);

        gameState.collectPickup('nitro');
        expect(gameState.nitroMs).toBe(gameState.stats.nitroMs);
        expect(gameState.stats.nitroMs).toBeGreaterThan(ARENA.NITRO_MS);
    });

    test('healing and reviving respect the upgraded health cap', () => {
        gameState.resetAll();
        gameState.scrap = 1000;
        gameState.buyUpgrade('armor');
        gameState.resetSession();

        gameState.takeDamage(10, false);
        gameState.collectPickup('heal');
        expect(gameState.health).toBe(ARENA.MAX_HEALTH + 20);
    });

    test('dropping a zombie shrinks the wave without scoring or building combo', () => {
        gameState.resetSession();
        gameState.startWave(2, 5);
        gameState.dropZombie();
        gameState.dropZombie();

        expect(gameState.remaining).toBe(3);
        expect(gameState.score).toBe(0);
        expect(gameState.combo).toBe(0);
        expect(gameState.smashes).toBe(0);

        for (let i = 0; i < 10; i++) gameState.dropZombie();
        expect(gameState.remaining).toBe(0);
    });

    test('a tie with the previous best is not a new best', () => {
        gameState.resetAll();
        gameState.hydrate({ bestScore: SCORE_VALUES.SMASH });

        gameState.resetSession();
        gameState.startWave(1, 3);
        expect(gameState.isNewBest()).toBe(false);

        gameState.registerKill('walker');
        expect(gameState.score).toBe(SCORE_VALUES.SMASH);
        expect(gameState.isNewBest()).toBe(false);

        gameState.registerKill('walker');
        expect(gameState.isNewBest()).toBe(true);

        gameState.resetAll();
        gameState.resetSession();
        gameState.startWave(1, 1);
        expect(gameState.isNewBest()).toBe(false);
    });

    test('haptics preference toggles, emits once per change, and persists', () => {
        const changes: boolean[] = [];
        EventBus.on(Events.HAPTICS_CHANGED, ({ enabled }) => changes.push(enabled));

        gameState.resetAll();
        expect(gameState.hapticsEnabled).toBe(true);

        gameState.setHaptics(true);
        gameState.setHaptics(false);
        gameState.setHaptics(false);
        expect(changes).toEqual([false]);
        expect(gameState.toSaveData().haptics).toBe(false);

        gameState.resetAll();
        gameState.hydrate({ haptics: false });
        expect(gameState.hapticsEnabled).toBe(false);
        // Cloud saves are untrusted JSON, so a wrong type must be ignored.
        gameState.hydrate(JSON.parse('{"haptics":"yes"}'));
        expect(gameState.hapticsEnabled).toBe(false);
    });
});
