import type { Page } from '@playwright/test';
import { readSnapshot } from './playables';

export { heapMiB, installMockSdk, lastSave, waitForScene } from './playables';

export interface Snapshot {
    activeScenes: string[];
    score: number;
    bestScore: number;
    combo: number;
    timeLeftMs: number;
    player: { x: number; y: number };
    speed: number;
    coin: { x: number; y: number };
    started: boolean;
    gameOver: boolean;
    paused: boolean;
    firstFrameReady: boolean;
    gameReady: boolean;
}

export async function snapshot(page: Page): Promise<Snapshot> {
    return readSnapshot<Snapshot>(page);
}

/** Screen position of a world point; every scene centres its camera on the world origin. */
export async function worldToScreen(
    page: Page,
    x: number,
    y: number
): Promise<{ x: number; y: number }> {
    return page.evaluate(
        ([wx, wy]) => {
            const canvas = document.querySelector('canvas');
            if (!canvas) throw new Error('canvas not found');
            const rect = canvas.getBoundingClientRect();
            const k = rect.height / canvas.height;
            return { x: rect.x + rect.width / 2 + wx * k, y: rect.y + rect.height / 2 + wy * k };
        },
        [x, y] as const
    );
}

const AXES = [
    { key: 'ArrowRight', pick: (dx: number, _dy: number) => dx > 0 },
    { key: 'ArrowLeft', pick: (dx: number, _dy: number) => dx < 0 },
    { key: 'ArrowDown', pick: (_dx: number, dy: number) => dy > 0 },
    { key: 'ArrowUp', pick: (_dx: number, dy: number) => dy < 0 }
] as const;

/** Holds the arrow keys that point from the player towards the coin. */
export class CoinChaser {
    private readonly held = new Set<string>();

    constructor(private readonly page: Page) {}

    async step(): Promise<Snapshot> {
        const state = await snapshot(this.page);
        const dx = state.coin.x - state.player.x;
        const dy = state.coin.y - state.player.y;
        // Ease off an axis once nearly aligned, so the player does not orbit the coin.
        const deadzone = 12;
        for (const { key, pick } of AXES) {
            const want = pick(Math.abs(dx) > deadzone ? dx : 0, Math.abs(dy) > deadzone ? dy : 0);
            if (want && !this.held.has(key)) {
                await this.page.keyboard.down(key);
                this.held.add(key);
            } else if (!want && this.held.has(key)) {
                await this.page.keyboard.up(key);
                this.held.delete(key);
            }
        }
        return state;
    }

    async stop(): Promise<void> {
        for (const key of this.held) await this.page.keyboard.up(key);
        this.held.clear();
    }
}
