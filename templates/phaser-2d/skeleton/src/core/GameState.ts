import { ROUND } from './Constants';
import {
    coinPoints,
    isCoinCollected,
    nextCombo,
    placeCoin,
    sanitizeBestScore,
    stepPlayer,
    timeAfterCoin,
    type Body,
    type Point
} from './CollectRules';
import { EventBus, Events } from './EventBus';
import type { GameSaveData } from './SaveData';

export class GameStateManager {
    score = 0;
    bestScore = 0;
    combo = 0;
    timeLeftMs: number = ROUND.DURATION_MS;
    started = false;
    paused = false;
    gameOver = false;
    newBest = false;
    readonly player: Body = { x: 0, y: 0, vx: 0, vy: 0 };
    readonly coin: Point = { x: 0, y: 0 };

    private msSinceCoin = Number.POSITIVE_INFINITY;

    startRun(rng: () => number): void {
        this.score = 0;
        this.combo = 0;
        this.timeLeftMs = ROUND.DURATION_MS;
        this.msSinceCoin = Number.POSITIVE_INFINITY;
        this.player.x = 0;
        this.player.y = 0;
        this.player.vx = 0;
        this.player.vy = 0;
        placeCoin(this.coin, this.player, rng);
        this.started = true;
        this.gameOver = false;
        this.newBest = false;

        EventBus.emit(Events.SCORE_CHANGED, { score: 0, delta: 0, bestScore: this.bestScore });
        EventBus.emit(Events.GAME_START, {});
    }

    /** Advances the run by one frame. Input is a direction with length <= 1. */
    tick(dtMs: number, inputX: number, inputY: number, rng: () => number): void {
        if (!this.started || this.gameOver || this.paused) return;

        stepPlayer(this.player, inputX, inputY, dtMs / 1000);
        this.msSinceCoin += dtMs;
        this.timeLeftMs -= dtMs;

        if (isCoinCollected(this.player, this.coin)) {
            this.collectCoin(rng);
        }

        if (this.timeLeftMs <= 0) {
            this.endRun();
        }
    }

    private collectCoin(rng: () => number): void {
        this.combo = nextCombo(this.combo, this.msSinceCoin);
        const points = coinPoints(this.combo);
        const { x, y } = this.coin;
        this.score += points;
        this.timeLeftMs = timeAfterCoin(this.timeLeftMs);
        this.msSinceCoin = 0;
        placeCoin(this.coin, this.player, rng);

        EventBus.emit(Events.COIN_COLLECTED, { points, combo: this.combo, x, y });
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
        this.score = 0;
        this.bestScore = 0;
        this.combo = 0;
        this.timeLeftMs = ROUND.DURATION_MS;
        this.started = false;
        this.paused = false;
        this.gameOver = false;
        this.newBest = false;
        this.msSinceCoin = Number.POSITIVE_INFINITY;
        this.player.x = 0;
        this.player.y = 0;
        this.player.vx = 0;
        this.player.vy = 0;
    }
}

export const gameState = new GameStateManager();
