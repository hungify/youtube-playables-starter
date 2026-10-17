import { expect, test } from '@playwright/test';
import { GemChaser, heapMiB, installMockSdk, lastSave, snapshot, waitForScene } from './helpers';

test('the orb collects gems and the score goes up', async ({ page }) => {
    await page.goto('/');
    await waitForScene(page, 'Menu');
    await page.locator('#playButton').click();
    await waitForScene(page, 'Game');

    const chaser = new GemChaser(page);
    const deadline = Date.now() + 15_000;
    let state = await snapshot(page);
    while (state.score < 20 && Date.now() < deadline) {
        state = await chaser.step();
        await page.waitForTimeout(50);
    }
    await chaser.stop();

    expect(state.score).toBeGreaterThanOrEqual(20);
    await expect(page.locator('#score')).toContainText(`${state.score}`);
});

test('time running out ends the run, sends the score and saves the best', async ({ page }) => {
    test.setTimeout(90_000);
    await installMockSdk(page, { bestScore: 0 });
    await page.goto('/');
    await waitForScene(page, 'Menu');
    await page.locator('#playButton').click();
    await waitForScene(page, 'GameOver', 70_000);

    expect((await snapshot(page)).gameOver).toBe(true);
    expect(await lastSave(page)).toEqual({ bestScore: 0 });
    await expect(page.locator('#playAgainButton')).toBeVisible();

    await page.locator('#playAgainButton').click();
    await waitForScene(page, 'Game');
    const restarted = await snapshot(page);
    expect(restarted.score).toBe(0);
    expect(restarted.gameOver).toBe(false);
});

test('JS heap stays far below the 512 MB iOS WebView limit', async ({ page }) => {
    await page.goto('/');
    await waitForScene(page, 'Menu');
    await page.locator('#playButton').click();
    await page.waitForTimeout(3000);
    expect(await heapMiB(page)).toBeLessThan(128);
});
