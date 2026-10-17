import { ROUND, SCREENS, type ScreenName } from './Constants';
import {
    gemPoints,
    isGemCollected,
    nextCombo,
    placeGem,
    sanitizeBestScore,
    stepOrb,
    timeAfterGem,
    type Body,
    type Point
} from './DriftRules';
import { EventBus, Events } from './EventBus';
import type { GameSaveData } from './SaveData';

export class GameStateManager {
    screen: ScreenName = SCREENS.BOOT;
    score = 0;
    bestScore = 0;
    combo = 0;
    timeLeftMs: number = ROUND.DURATION_MS;
    started = false;
    paused = false;
    gameOver = false;
    newBest = false;
    readonly orb: Body = { x: 0, z: 0, vx: 0, vz: 0 };
    readonly gem: Point = { x: 0, z: 0 };

    private msSinceGem = Number.POSITIVE_INFINITY;

    setScreen(screen: ScreenName): void {
        if (this.screen === screen) return;
        this.screen = screen;
        EventBus.emit(Events.SCREEN_CHANGED, { screen });
    }

    startRun(rng: () => number): void {
        this.score = 0;
        this.combo = 0;
        this.timeLeftMs = ROUND.DURATION_MS;
        this.msSinceGem = Number.POSITIVE_INFINITY;
        this.orb.x = 0;
        this.orb.z = 0;
        this.orb.vx = 0;
        this.orb.vz = 0;
        placeGem(this.gem, this.orb, rng);
        this.started = true;
        this.gameOver = false;
        this.newBest = false;

        EventBus.emit(Events.SCORE_CHANGED, {
            score: 0,
            delta: 0,
            bestScore: this.bestScore
        });
        EventBus.emit(Events.GAME_START, {});
        this.setScreen(SCREENS.GAME);
    }

    /** Advances the run by one frame. Input is a direction with length <= 1. */
    tick(dtMs: number, inputX: number, inputZ: number, rng: () => number): void {
        if (!this.started || this.gameOver || this.paused) return;

        stepOrb(this.orb, inputX, inputZ, dtMs / 1000);
        this.msSinceGem += dtMs;
        this.timeLeftMs -= dtMs;

        if (isGemCollected(this.orb, this.gem)) {
            this.collectGem(rng);
        }

        if (this.timeLeftMs <= 0) {
            this.endRun();
        }
    }

    private collectGem(rng: () => number): void {
        this.combo = nextCombo(this.combo, this.msSinceGem);
        const points = gemPoints(this.combo);
        const { x, z } = this.gem;
        this.score += points;
        this.timeLeftMs = timeAfterGem(this.timeLeftMs);
        this.msSinceGem = 0;
        placeGem(this.gem, this.orb, rng);

        EventBus.emit(Events.GEM_COLLECTED, { points, combo: this.combo, x, z });
        EventBus.emit(Events.SCORE_CHANGED, {
            score: this.score,
            delta: points,
            bestScore: Math.max(this.bestScore, this.score)
        });
    }

    endRun(): void {
        if (!this.started || this.gameOver) return;
        this.started = false;
        this.gameOver = true;
        this.timeLeftMs = 0;
        this.newBest = this.score > this.bestScore;
        this.bestScore = Math.max(this.bestScore, this.score);

        EventBus.emit(Events.GAME_OVER, {
            score: this.score,
            bestScore: this.bestScore,
            newBest: this.newBest
        });
        this.setScreen(SCREENS.GAME_OVER);
    }

    hydrate(saveData: GameSaveData | undefined | null): void {
        const best = sanitizeBestScore(saveData?.bestScore);
        if (best !== null) this.bestScore = Math.max(this.bestScore, best);
    }

    toSaveData(): GameSaveData {
        return { bestScore: this.bestScore };
    }

    /** Back to a fresh install state; used by tests. */
    resetAll(): void {
        this.screen = SCREENS.BOOT;
        this.score = 0;
        this.bestScore = 0;
        this.combo = 0;
        this.timeLeftMs = ROUND.DURATION_MS;
        this.started = false;
        this.paused = false;
        this.gameOver = false;
        this.newBest = false;
        this.msSinceGem = Number.POSITIVE_INFINITY;
        this.orb.x = 0;
        this.orb.z = 0;
        this.orb.vx = 0;
        this.orb.vz = 0;
    }
}

export const gameState = new GameStateManager();
