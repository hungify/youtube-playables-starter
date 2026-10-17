import { expect, test } from '@playwright/test';
import { ZombieHunter, canvasMetrics, snapshot, waitForScene } from './helpers';

test.describe('Zombie Rush gameplay', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await waitForScene(page, 'MainMenu');
    });

    test('render_game_to_text exposes a valid state snapshot', async ({ page }) => {
        const state = await snapshot(page);
        expect(state.activeScenes).toContain('MainMenu');
        for (const key of ['score', 'wave', 'health', 'speed', 'smashes', 'scrap'] as const) {
            expect(typeof state[key]).toBe('number');
        }
        expect(Array.isArray(state.nearestZombies)).toBe(true);
    });

    test('tapping the menu starts a run and the first wave spawns zombies', async ({ page }) => {
        test.setTimeout(75_000);
        const { x, y, w, h } = await canvasMetrics(page);
        await page.mouse.click(x + w / 2, y + h / 2);
        await waitForScene(page, 'Game');

        await expect
            .poll(async () => (await snapshot(page)).wave, { timeout: 45_000 })
            .toBeGreaterThanOrEqual(1);

        const state = await snapshot(page);
        expect(state.zombiesLeft).toBeGreaterThan(0);
        expect(state.health).toBeGreaterThan(0);
        expect(state.nearestZombies.length).toBeGreaterThan(0);
    });

    test('ramming a zombie scores points and clears it from the wave', async ({ page }) => {
        test.setTimeout(90_000);
        const { x, y, w, h } = await canvasMetrics(page);
        await page.mouse.click(x + w / 2, y + h / 2);
        await waitForScene(page, 'Game');
        await page.mouse.up();

        const hunter = new ZombieHunter(page);
        await hunter.start();

        let state = await snapshot(page);
        const deadline = Date.now() + 60_000;
        while (Date.now() < deadline && state.smashes < 1 && !state.gameOver) {
            state = await hunter.step();
            await page.waitForTimeout(60);
        }
        await hunter.stop();

        expect(state.smashes).toBeGreaterThanOrEqual(1);
        expect(state.score).toBeGreaterThan(0);
        expect(state.zombiesLeft).toBeLessThan(9);
    });

    test('a car left idle is bitten to death and the run ends, then retry restarts cleanly', async ({
        page
    }) => {
        test.setTimeout(120_000);
        const { x, y, w, h, k } = await canvasMetrics(page).then((m) => ({ ...m }));
        await page.mouse.click(x + w / 2, y + h / 2);
        await waitForScene(page, 'Game');

        await waitForScene(page, 'GameOver', 90_000);
        const over = await snapshot(page);
        expect(over.gameOver).toBe(true);
        expect(over.health).toBe(0);
        expect(over.wave).toBeGreaterThanOrEqual(1);

        // "TAP TO RETRY" sits near the bottom of the screen.
        await page.mouse.click(x + w / 2, y + h - 70 * k);
        await waitForScene(page, 'Game');

        const fresh = await snapshot(page);
        expect(fresh.gameOver).toBe(false);
        expect(fresh.score).toBe(0);
        expect(fresh.health).toBeGreaterThan(0);
    });

    test('survives resizing during a run without errors or lost state', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(String(error)));

        const { x, y, w, h } = await canvasMetrics(page);
        await page.mouse.click(x + w / 2, y + h / 2);
        await waitForScene(page, 'Game');
        await expect
            .poll(async () => (await snapshot(page)).wave, { timeout: 15_000 })
            .toBeGreaterThanOrEqual(1);

        const before = await snapshot(page);
        for (const size of [
            { width: 1194, height: 834 },
            { width: 390, height: 844 },
            { width: 834, height: 1194 }
        ]) {
            await page.setViewportSize(size);
            await page.waitForTimeout(400);
        }

        const after = await snapshot(page);
        expect(after.activeScenes).toContain('Game');
        expect(after.wave).toBeGreaterThanOrEqual(before.wave);
        expect(errors).toEqual([]);
    });

    test('JS heap stays far below the 512 MB iOS WebView limit', async ({ page }) => {
        test.setTimeout(60_000);
        const { x, y, w, h } = await canvasMetrics(page);
        await page.mouse.click(x + w / 2, y + h / 2);
        await waitForScene(page, 'Game');
        await page.waitForTimeout(15_000);

        const usedMb = await page.evaluate(() => {
            const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } })
                .memory;
            return memory ? memory.usedJSHeapSize / (1024 * 1024) : 0;
        });
        expect(usedMb).toBeLessThan(200);
    });
});
