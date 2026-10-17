import { expect, test } from '@playwright/test';

interface Snapshot {
    activeScenes: string[];
}

// Outside YouTube the `ytgame` SDK is absent, so the ready flags stay false; assert on scenes only.
test('boots to the main menu', async ({ page }) => {
    await page.goto('/');

    await expect
        .poll(
            async () => {
                const raw = await page.evaluate(() => window.render_game_to_text?.() ?? '{}');
                const snapshot: Partial<Snapshot> = JSON.parse(raw);
                return snapshot.activeScenes ?? [];
            },
            { timeout: 30_000 }
        )
        .toContain('MainMenu');
});
