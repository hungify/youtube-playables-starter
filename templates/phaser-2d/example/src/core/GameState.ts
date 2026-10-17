import {
    ARENA,
    COMBO_STREAKS,
    DEFAULT_CAR,
    SCORE_VALUES,
    type CarId,
    type UpgradeId
} from './Constants';
import {
    isCarId,
    isCarUnlocked,
    newlyUnlockedCars,
    smashPoints,
    type PickupKind,
    type ZombieKind
} from './ArenaRules';
import { EventBus, Events, type HitKind } from './EventBus';
import {
    NO_UPGRADES,
    computeStats,
    sanitizeLevels,
    scrapEarned,
    upgradeCost,
    type CarStats,
    type UpgradeLevels
} from './Upgrades';
import type { GameSaveData } from './SaveData';

export class GameStateManager {
    score = 0;
    bestScore = 0;
    /** Best score when the current run began, to tell a real record from a tie. */
    bestAtRunStart = 0;
    smashes = 0;
    wave = 0;
    remaining = 0;
    scrap = 0;
    scrapEarnedLastRun = 0;
    upgrades: UpgradeLevels = { ...NO_UPGRADES };
    stats: CarStats = computeStats(NO_UPGRADES);
    health: number = ARENA.MAX_HEALTH;
    nitroMs = 0;
    combo = 0;
    speed = 0;
    playerX: number = ARENA.PLAYER_START_X;
    playerY: number = ARENA.PLAYER_START_Y;
    /** Flat [x, y, isBoss] triples of active zombies, for the radar and QA hooks. */
    radar = new Float32Array(ARENA.ZOMBIE_POOL_SIZE * ARENA.RADAR_STRIDE);
    radarCount = 0;
    pickupRadar = new Float32Array(ARENA.PICKUP_POOL_SIZE * 2);
    pickupCount = 0;
    activeCar: CarId = DEFAULT_CAR;
    started = false;
    paused = false;
    gameOver = false;
    reviveUsed = false;
    hapticsEnabled = true;

    private msSinceSmash = 0;

    resetSession(): void {
        this.score = 0;
        this.bestAtRunStart = this.bestScore;
        this.smashes = 0;
        this.wave = 0;
        this.remaining = 0;
        this.health = this.stats.maxHealth;
        this.nitroMs = 0;
        this.combo = 0;
        this.speed = 0;
        this.playerX = ARENA.PLAYER_START_X;
        this.playerY = ARENA.PLAYER_START_Y;
        this.radarCount = 0;
        this.pickupCount = 0;
        this.msSinceSmash = 0;
        this.started = true;
        this.paused = false;
        this.gameOver = false;
        this.reviveUsed = false;

        EventBus.emit(Events.HEALTH_CHANGED, { health: this.health, max: this.stats.maxHealth });
        EventBus.emit(Events.WAVE_CHANGED, { wave: this.wave, remaining: this.remaining });
        EventBus.emit(Events.SCORE_CHANGED, {
            score: this.score,
            delta: 0,
            bestScore: this.bestScore
        });
        EventBus.emit(Events.GAME_START, { health: this.health });
    }

    resetAll(): void {
        this.bestScore = 0;
        this.hapticsEnabled = true;
        this.scrap = 0;
        this.upgrades = { ...NO_UPGRADES };
        this.stats = computeStats(this.upgrades);
        this.activeCar = DEFAULT_CAR;
        this.resetSession();
    }

    hydrate(saveData: GameSaveData | undefined | null): void {
        if (!saveData) return;

        if (typeof saveData.bestScore === 'number' && Number.isFinite(saveData.bestScore)) {
            this.bestScore = Math.max(0, Math.floor(saveData.bestScore));
        }

        if (isCarId(saveData.activeCar) && isCarUnlocked(saveData.activeCar, this.bestScore)) {
            this.activeCar = saveData.activeCar;
        }

        if (typeof saveData.scrap === 'number' && Number.isFinite(saveData.scrap)) {
            this.scrap = Math.max(0, Math.floor(saveData.scrap));
        }
        if (typeof saveData.haptics === 'boolean') {
            this.hapticsEnabled = saveData.haptics;
        }
        this.upgrades = sanitizeLevels(saveData.upgrades);
        this.stats = computeStats(this.upgrades);

        EventBus.emit(Events.CAR_CHANGED, { activeCar: this.activeCar });
    }

    toSaveData(): GameSaveData {
        return {
            activeCar: this.activeCar,
            bestScore: this.bestScore,
            scrap: this.scrap,
            upgrades: { ...this.upgrades },
            haptics: this.hapticsEnabled
        };
    }

    /** Spends scrap on the next level of an upgrade. Returns false when it cannot be bought. */
    buyUpgrade(id: UpgradeId): boolean {
        const cost = upgradeCost(id, this.upgrades[id]);
        if (cost === null || this.scrap < cost) return false;

        this.scrap -= cost;
        this.upgrades = { ...this.upgrades, [id]: this.upgrades[id] + 1 };
        this.stats = computeStats(this.upgrades);
        EventBus.emit(Events.UPGRADE_BOUGHT, {
            id,
            level: this.upgrades[id],
            scrap: this.scrap
        });
        return true;
    }

    isCarUnlocked(car: CarId): boolean {
        return isCarUnlocked(car, this.bestScore);
    }

    selectCar(car: CarId): CarId {
        if (this.isCarUnlocked(car)) {
            this.activeCar = car;
            EventBus.emit(Events.CAR_CHANGED, { activeCar: this.activeCar });
        }
        return this.activeCar;
    }

    setHaptics(enabled: boolean): void {
        if (enabled === this.hapticsEnabled) return;
        this.hapticsEnabled = enabled;
        EventBus.emit(Events.HAPTICS_CHANGED, { enabled });
    }

    isBoosted(): boolean {
        return this.nitroMs > 0;
    }

    /** Advances the nitro and combo timers. */
    advance(dtMs: number): void {
        if (!this.started || this.gameOver || dtMs <= 0) return;

        this.nitroMs = Math.max(0, this.nitroMs - dtMs);

        if (this.combo > 0) {
            this.msSinceSmash += dtMs;
            if (this.msSinceSmash > ARENA.COMBO_WINDOW_MS) {
                this.combo = 0;
            }
        }
    }

    startWave(wave: number, zombies: number): void {
        this.wave = wave;
        this.remaining = zombies;
        EventBus.emit(Events.WAVE_CHANGED, { wave: this.wave, remaining: this.remaining });
    }

    /** A zombie went down (rammed or blown up). Returns the points it scored. */
    registerKill(kind: ZombieKind): number {
        this.remaining = Math.max(0, this.remaining - 1);
        this.smashes += 1;
        this.combo += 1;
        this.msSinceSmash = 0;

        const points = smashPoints(this.combo, kind);
        this.addPoints(points);
        this.emitHit(kind === 'boss' ? 'boss' : 'smash', points);
        EventBus.emit(Events.WAVE_CHANGED, { wave: this.wave, remaining: this.remaining });

        if (this.combo > 1) {
            EventBus.emit(Events.SPECTACLE_COMBO, { combo: this.combo });
        }
        if (COMBO_STREAKS.includes(this.combo)) {
            EventBus.emit(Events.SPECTACLE_STREAK, { streak: this.combo });
        }
        return points;
    }

    /** Removes a zombie from the wave without scoring it (e.g. the revive blast). */
    dropZombie(): void {
        this.remaining = Math.max(0, this.remaining - 1);
        EventBus.emit(Events.WAVE_CHANGED, { wave: this.wave, remaining: this.remaining });
    }

    isNewBest(): boolean {
        return this.score > this.bestAtRunStart;
    }

    registerBarrel(): void {
        this.addPoints(SCORE_VALUES.BARREL);
        this.emitHit('barrel', SCORE_VALUES.BARREL);
    }

    collectPickup(kind: PickupKind): void {
        if (kind === 'heal') {
            this.setHealth(Math.min(this.stats.maxHealth, this.health + ARENA.HEAL_AMOUNT));
        } else {
            this.nitroMs = this.stats.nitroMs;
        }
        this.addPoints(SCORE_VALUES.PICKUP);
        this.emitHit('pickup', SCORE_VALUES.PICKUP);
    }

    /** Applies damage. Returns true when the car is destroyed. */
    takeDamage(amount: number, resetsCombo: boolean): boolean {
        if (amount <= 0 || this.gameOver) return this.health <= 0;

        this.setHealth(Math.max(0, this.health - amount));
        if (resetsCombo) {
            this.combo = 0;
            this.emitHit('crash', 0);
        }
        return this.health <= 0;
    }

    /** Pays the wave bonus unless the wave was cleared for free (the revive blast). */
    clearWave(award = true): number {
        if (!award) return 0;

        const bonus = SCORE_VALUES.WAVE_CLEAR * this.wave;
        this.addPoints(bonus);
        this.emitHit('wave', bonus);
        return bonus;
    }

    canRevive(): boolean {
        return this.started && !this.gameOver && this.health <= 0 && !this.reviveUsed;
    }

    /** Grants the single rewarded-ad repair of a run. Returns false when it is not allowed. */
    revive(): boolean {
        if (!this.canRevive()) return false;
        this.reviveUsed = true;
        this.setHealth(Math.min(this.stats.maxHealth, ARENA.REVIVE_HEALTH));
        return true;
    }

    finishGame(): void {
        this.gameOver = true;
        this.started = false;
        this.scrapEarnedLastRun = scrapEarned(this.smashes, this.wave);
        this.scrap += this.scrapEarnedLastRun;
        EventBus.emit(Events.GAME_OVER, {
            score: this.score,
            bestScore: this.bestScore,
            wave: this.wave,
            smashes: this.smashes
        });
    }

    private setHealth(health: number): void {
        this.health = health;
        EventBus.emit(Events.HEALTH_CHANGED, { health: this.health, max: this.stats.maxHealth });
    }

    private addPoints(points: number): void {
        const previousBest = this.bestScore;
        this.score += points;
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
        }

        for (const car of newlyUnlockedCars(previousBest, this.bestScore)) {
            EventBus.emit(Events.CAR_UNLOCKED, { car });
        }
        EventBus.emit(Events.SCORE_CHANGED, {
            score: this.score,
            delta: points,
            bestScore: this.bestScore
        });
    }

    private emitHit(kind: HitKind, points: number): void {
        EventBus.emit(Events.SPECTACLE_HIT, { kind, points });
    }
}

export const gameState = new GameStateManager();
