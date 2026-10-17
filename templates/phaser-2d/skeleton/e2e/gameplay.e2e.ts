import { expect, test } from '@playwright/test';
import { LAYOUT } from '../src/core/Constants';
import {
    CoinChaser,
    heapMiB,
    installMockSdk,
    lastSave,
    snapshot,
    waitForScene,
    worldToScreen
} from './helpers';

test('tapping Play starts a run and the player collects coins', async ({ page }) => {
    await page.goto('/');
    await waitForScene(page, 'MainMenu');
    const play = await worldToScreen(page, 0, LAYOUT.BUTTON_Y);
    await page.mouse.click(play.x, play.y);
    await waitForScene(page, 'Game');

    const chaser = new CoinChaser(page);
    const deadline = Date.now() + 15_000;
    let state = await snapshot(page);
    while (state.score < 20 && Date.now() < deadline) {
        state = await chaser.step();
        await page.waitForTimeout(50);
    }
    await chaser.stop();

    expect(state.score).toBeGreaterThanOrEqual(20);
});

test('time running out ends the run, saves the best, and Enter restarts cleanly', async ({
    page
}) => {
    test.setTimeout(60_000);
    await installMockSdk(page, { bestScore: 0 });
    await page.goto('/');
    await waitForScene(page, 'MainMenu');
    await page.keyboard.press('Enter');
    await waitForScene(page, 'GameOver', 40_000);

    expect((await snapshot(page)).gameOver).toBe(true);
    expect(await lastSave(page)).toEqual({ bestScore: 0 });

    await page.keyboard.press('Enter');
    await waitForScene(page, 'Game');
    const restarted = await snapshot(page);
    expect(restarted.score).toBe(0);
    expect(restarted.gameOver).toBe(false);
});

test('JS heap stays far below the 512 MB iOS WebView limit', async ({ page }) => {
    await page.goto('/');
    await waitForScene(page, 'MainMenu');
    await page.keyboard.press('Enter');
    await waitForScene(page, 'Game');
    await page.waitForTimeout(3000);
    expect(await heapMiB(page)).toBeLessThan(128);
});
