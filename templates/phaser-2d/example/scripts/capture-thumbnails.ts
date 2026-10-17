/**
 * Captures store thumbnails from real gameplay at several aspect ratios.
 * Start the dev server first (`bun run dev`), then run: bun scripts/capture-thumbnails.ts
 * Output: store/thumbnails/zombie-rush-<ratio>.png (submitted through the Playables Developer
 * Portal, so they are intentionally not part of the game bundle).
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { ZombieHunter, canvasMetrics, waitForScene } from '../e2e/helpers';

const BASE_URL = `http://localhost:${process.env['PORT'] ?? 8080}`;
const OUT_DIR = join(import.meta.dir, '..', 'store', 'thumbnails');
const PLAY_MS = 7000;
const SHOTS = [
    { name: '16x9', width: 1280, height: 720 },
    { name: '1x1', width: 1000, height: 1000 },
    { name: '9x16', width: 720, height: 1280 }
] as const;

mkdirSync(OUT_DIR, { recursive: true });
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });

try {
    for (const shot of SHOTS) {
        const page = await browser.newPage({
            viewport: { width: shot.width, height: shot.height }
        });
        await page.goto(BASE_URL);
        await waitForScene(page, 'MainMenu');

        const { x, y, w, h } = await canvasMetrics(page);
        await page.mouse.click(x + w / 2, y + h / 2);
        await waitForScene(page, 'Game');
        await page.mouse.up();

        const hunter = new ZombieHunter(page);
        await hunter.start();
        const until = Date.now() + PLAY_MS;
        while (Date.now() < until) {
            await hunter.step();
            await page.waitForTimeout(60);
        }

        const file = join(OUT_DIR, `zombie-rush-${shot.name}.png`);
        await page.screenshot({ path: file });
        await hunter.stop();
        console.log(`wrote ${file} (${shot.width}x${shot.height})`);
        await page.close();
    }
} finally {
    await browser.close();
}
