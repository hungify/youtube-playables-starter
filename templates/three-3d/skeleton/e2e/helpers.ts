import type { Page } from '@playwright/test';
import { readSnapshot } from './playables';

export { installMockSdk, lastSave, waitForScene, heapMiB } from './playables';

export interface Snapshot {
    activeScenes: string[];
    score: number;
    bestScore: number;
    combo: number;
    timeLeftMs: number;
    player: { x: number; z: number };
    speed: number;
    gem: { x: number; z: number };
    started: boolean;
    gameOver: boolean;
    paused: boolean;
    firstFrameReady: boolean;
    gameReady: boolean;
}

export async function snapshot(page: Page): Promise<Snapshot> {
    return readSnapshot<Snapshot>(page);
}

const AXES = [
    { key: 'ArrowRight', pick: (dx: number, _dz: number) => dx > 0 },
    { key: 'ArrowLeft', pick: (dx: number, _dz: number) => dx < 0 },
    { key: 'ArrowDown', pick: (_dx: number, dz: number) => dz > 0 },
    { key: 'ArrowUp', pick: (_dx: number, dz: number) => dz < 0 }
] as const;

/** Holds the arrow keys that point from the orb towards the gem. */
export class GemChaser {
    private readonly held = new Set<string>();

    constructor(private readonly page: Page) {}

    async step(): Promise<Snapshot> {
        const state = await snapshot(this.page);
        const dx = state.gem.x - state.player.x;
        const dz = state.gem.z - state.player.z;
        // Ease off an axis once nearly aligned, so the orb does not orbit the gem.
        const deadzone = 0.4;
        for (const { key, pick } of AXES) {
            const want = pick(Math.abs(dx) > deadzone ? dx : 0, Math.abs(dz) > deadzone ? dz : 0);
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
