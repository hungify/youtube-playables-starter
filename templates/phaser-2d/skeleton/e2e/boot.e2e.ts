import { expect, test } from '@playwright/test';
import { installMockSdk, snapshot, waitForScene } from './helpers';

test('boots to the main menu without the SDK (plain browser)', async ({ page }) => {
    await page.goto('/');
    await waitForScene(page, 'MainMenu');
});

test('signals firstFrameReady then gameReady once the menu is interactive', async ({ page }) => {
    await installMockSdk(page, { bestScore: 70 });
    await page.goto('/');
    await waitForScene(page, 'MainMenu');

    const state = await snapshot(page);
    expect(state.firstFrameReady).toBe(true);
    expect(state.gameReady).toBe(true);
    expect(state.bestScore).toBe(70);
});

test('canvas fills portrait and landscape viewports', async ({ page }) => {
    for (const size of [
        { width: 390, height: 844 },
        { width: 1280, height: 720 }
    ]) {
        await page.setViewportSize(size);
        await page.goto('/');
        await waitForScene(page, 'MainMenu');
        const box = await page.locator('canvas').boundingBox();
        expect(box?.width).toBeCloseTo(size.width, 0);
        expect(box?.height).toBeCloseTo(size.height, 0);
    }
});
