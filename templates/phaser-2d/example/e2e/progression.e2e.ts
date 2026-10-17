import { expect, test, type Page } from '@playwright/test';
import {
    adsWatched,
    canvasMetrics,
    gameSize,
    installMockSdk,
    lastSave,
    snapshot,
    waitForScene
} from './helpers';

/** Starts a run from the menu and leaves the car idle until zombies destroy it. */
async function startAndLetCarDie(page: Page): Promise<void> {
    const { x, y, w, h } = await canvasMetrics(page);
    await page.mouse.click(x + w / 2, y + h / 2);
    await waitForScene(page, 'Game');
    await expect.poll(async () => (await snapshot(page)).health, { timeout: 80_000 }).toBe(0);
    await page.waitForTimeout(1600);
}

/** Screen position of a point given in game pixels. */
async function gamePoint(page: Page, gx: number, gy: number): Promise<{ x: number; y: number }> {
    const { k, x, y } = await canvasMetrics(page);
    return { x: x + gx * k, y: y + gy * k };
}

test.describe('progression, ads and settings', () => {
    test('the haptics toggle flips the preference', async ({ page }) => {
        await page.goto('/');
        await waitForScene(page, 'MainMenu');

        const before = await snapshot(page);
        test.skip(!before.hapticsSupported, 'Vibration API is not available in this browser');
        expect(before.haptics).toBe(true);

        const size = await gameSize(page);
        // Audio icon sits at the top-right corner, the haptics icon just left of it.
        const target = await gamePoint(page, size.width - 144, 40);
        await page.mouse.click(target.x, target.y);
        await expect.poll(async () => (await snapshot(page)).haptics).toBe(false);

        await page.mouse.click(target.x, target.y);
        await expect.poll(async () => (await snapshot(page)).haptics).toBe(true);
    });

    test('Esc declines the revive offer without watching an ad', async ({ page }) => {
        test.setTimeout(120_000);
        await installMockSdk(page);
        await page.goto('/');
        await waitForScene(page, 'MainMenu');

        await startAndLetCarDie(page);
        expect((await snapshot(page)).gameOver).toBe(false);

        await page.keyboard.press('Escape');
        await waitForScene(page, 'GameOver', 15_000);
        expect(await adsWatched(page)).toBe(0);
    });

    test('revive repairs the car once and the blast does not award points or combo', async ({
        page
    }) => {
        test.setTimeout(150_000);
        await installMockSdk(page);
        await page.goto('/');
        await waitForScene(page, 'MainMenu');

        await startAndLetCarDie(page);
        const before = await snapshot(page);
        expect(before.score).toBe(0);
        expect(before.smashes).toBe(0);

        const size = await gameSize(page);
        const watch = await gamePoint(page, size.width / 2, size.height / 2 + 65);
        await page.mouse.click(watch.x, watch.y);

        await expect.poll(async () => (await snapshot(page)).health).toBeGreaterThan(0);
        const after = await snapshot(page);
        expect(await adsWatched(page)).toBe(1);
        expect(after.activeScenes).toContain('Game');
        expect(after.score).toBe(0);
        expect(after.smashes).toBe(0);
        expect(after.combo).toBe(0);
        expect(after.zombiesLeft).toBeLessThan(before.zombiesLeft);

        // Dying again ends the run: the repair is once per run.
        await waitForScene(page, 'GameOver', 100_000);
        expect(await adsWatched(page)).toBe(1);
    });

    test('buying an upgrade spends scrap, raises the level and is saved to the cloud', async ({
        page
    }) => {
        test.setTimeout(150_000);
        await installMockSdk(page, { scrap: 300, bestScore: 0 });
        await page.goto('/');
        await waitForScene(page, 'MainMenu');
        expect((await snapshot(page)).scrap).toBe(300);

        await startAndLetCarDie(page);
        await page.keyboard.press('Escape');
        await waitForScene(page, 'GameOver', 15_000);

        const over = await snapshot(page);
        const size = await gameSize(page);
        const top = Math.max(0, (size.height - 1180) / 2);
        // First shop card (ARMOR): left column of the 2x2 grid, first row.
        const card = await gamePoint(page, size.width / 2 - 193, top + 448 + 70 + 59);
        await page.mouse.click(card.x, card.y);

        await expect.poll(async () => (await snapshot(page)).upgrades['armor']).toBe(1);
        const after = await snapshot(page);
        expect(after.scrap).toBe(over.scrap - 40);

        const saved = await lastSave(page);
        expect(saved?.['scrap']).toBe(after.scrap);
        expect(saved?.['upgrades']).toMatchObject({ armor: 1 });
    });
});
