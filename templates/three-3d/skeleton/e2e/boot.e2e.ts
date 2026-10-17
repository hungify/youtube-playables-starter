import { expect, test } from '@playwright/test';
import { installMockSdk, snapshot, waitForScene } from './helpers';

test('boots to the menu without the SDK (plain browser)', async ({ page }) => {
    await page.goto('/');
    await waitForScene(page, 'Menu');
    await expect(page.locator('#playButton')).toBeVisible();
});

test('signals firstFrameReady then gameReady once the menu is interactive', async ({ page }) => {
    await installMockSdk(page, { bestScore: 70 });
    await page.goto('/');
    await waitForScene(page, 'Menu');

    const state = await snapshot(page);
    expect(state.firstFrameReady).toBe(true);
    expect(state.gameReady).toBe(true);
    expect(state.bestScore).toBe(70);
    await expect(page.locator('#menuBest')).toHaveText('Best 70');
});

test('canvas fills portrait and landscape viewports', async ({ page }) => {
    for (const size of [
        { width: 390, height: 844 },
        { width: 1280, height: 720 }
    ]) {
        await page.setViewportSize(size);
        await page.goto('/');
        await waitForScene(page, 'Menu');
        const box = await page.locator('canvas').boundingBox();
        expect(box?.width).toBe(size.width);
        expect(box?.height).toBe(size.height);
    }
});
