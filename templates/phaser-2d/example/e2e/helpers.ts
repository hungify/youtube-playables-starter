import type { Page } from '@playwright/test';
import { readSnapshot } from './playables';

export { adsWatched, installMockSdk, lastSave, waitForScene } from './playables';

export interface ZombieDot {
    x: number;
    y: number;
    boss: boolean;
}

export interface Snapshot {
    activeScenes: string[];
    score: number;
    wave: number;
    zombiesLeft: number;
    health: number;
    player: { x: number; y: number };
    speed: number;
    smashes: number;
    combo: number;
    nitroMs: number;
    scrap: number;
    haptics: boolean;
    hapticsSupported: boolean;
    upgrades: Record<string, number>;
    gameOver: boolean;
    nearestZombies: ZombieDot[];
}

export async function snapshot(page: Page): Promise<Snapshot> {
    return readSnapshot<Snapshot>(page);
}

/** Screen pixels per game pixel and the canvas origin, to aim at world-space targets. */
export async function canvasMetrics(
    page: Page
): Promise<{ k: number; x: number; y: number; w: number; h: number }> {
    return page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        if (!canvas) throw new Error('canvas not found');
        const rect = canvas.getBoundingClientRect();
        return {
            k: rect.width / canvas.width,
            x: rect.x,
            y: rect.y,
            w: rect.width,
            h: rect.height
        };
    });
}

/**
 * Drives the car at the nearest zombie while holding the pointer down. If the car stops moving
 * (pinned against an obstacle) it steers in a random direction for a moment.
 */
export class ZombieHunter {
    private slowTicks = 0;
    private recoverUntil = 0;
    private escape = { x: 750, y: 750 };

    constructor(private readonly page: Page) {}

    async start(): Promise<void> {
        const metrics = await canvasMetrics(this.page);
        await this.page.mouse.move(metrics.x + metrics.w / 2, metrics.y + metrics.h / 2);
        await this.page.mouse.down();
    }

    async step(): Promise<Snapshot> {
        const state = await snapshot(this.page);
        const metrics = await canvasMetrics(this.page);
        const now = Date.now();

        this.slowTicks = state.speed < 120 && now > this.recoverUntil ? this.slowTicks + 1 : 0;
        if (this.slowTicks > 8) {
            const angle = Math.random() * Math.PI * 2;
            this.recoverUntil = now + 1100;
            this.slowTicks = 0;
            this.escape = {
                x: state.player.x + Math.cos(angle) * 400,
                y: state.player.y + Math.sin(angle) * 400
            };
        }

        const target =
            now < this.recoverUntil ? this.escape : (state.nearestZombies[0] ?? { x: 750, y: 750 });
        const sx = metrics.x + metrics.w / 2 + (target.x - state.player.x) * metrics.k;
        const sy = metrics.y + metrics.h / 2 + (target.y - state.player.y) * metrics.k;
        await this.page.mouse.move(
            Math.max(metrics.x + 4, Math.min(metrics.x + metrics.w - 4, sx)),
            Math.max(metrics.y + 4, Math.min(metrics.y + metrics.h - 4, sy))
        );
        return state;
    }

    async stop(): Promise<void> {
        await this.page.mouse.up();
    }
}

/** Game-pixel size of the canvas, used to place clicks on fixed HUD / layout positions. */
export async function gameSize(page: Page): Promise<{ width: number; height: number }> {
    return page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        if (!canvas) throw new Error('canvas not found');
        return { width: canvas.width, height: canvas.height };
    });
}
