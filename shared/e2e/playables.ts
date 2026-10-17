import type { Page } from '@playwright/test';

/** Parses `window.render_game_to_text()`; each template types the snapshot it exposes. */
export async function readSnapshot<T>(page: Page): Promise<T> {
    const raw = await page.evaluate(() => window.render_game_to_text?.() ?? '{}');
    return JSON.parse(raw) as T;
}

/** Waits until the QA snapshot lists `scene` (a scene key or screen name) as active. */
export async function waitForScene(page: Page, scene: string, timeout = 30_000): Promise<void> {
    await page.waitForFunction(
        (name) => (window.render_game_to_text?.() ?? '').includes(`"${name}"`),
        scene,
        { timeout }
    );
}

/** Installs a fake YouTube Playables SDK so ads, saves and audio state can be exercised. */
export async function installMockSdk(
    page: Page,
    save: Record<string, unknown> = {}
): Promise<void> {
    await page.route('https://www.youtube.com/game_api/v1', (route) =>
        route.fulfill({ body: '', contentType: 'text/javascript' })
    );
    await page.addInitScript((initialSave) => {
        const w = window as unknown as Record<string, unknown>;
        w.playablesAds = 0;
        w.playablesSaves = [] as string[];
        w.ytgame = {
            SDK_VERSION: 'mock',
            IN_PLAYABLES_ENV: true,
            game: {
                firstFrameReady() {},
                gameReady() {},
                loadData: async () => JSON.stringify(initialSave),
                saveData: async (payload: string) => {
                    (w.playablesSaves as string[]).push(payload);
                }
            },
            engagement: { sendScore: async () => {} },
            system: {
                isAudioEnabled: () => true,
                onAudioEnabledChange: () => () => {},
                onPause: () => () => {},
                onResume: () => () => {},
                getLanguage: async () => 'en'
            },
            ads: {
                requestInterstitialAd: async () => {},
                requestRewardedAd: async () => {
                    w.playablesAds = (w.playablesAds as number) + 1;
                    return true;
                }
            },
            health: { logError() {}, logWarning() {} }
        };
    }, save);
}

export async function adsWatched(page: Page): Promise<number> {
    return page.evaluate(() => (window as unknown as { playablesAds: number }).playablesAds);
}

export async function lastSave(page: Page): Promise<Record<string, unknown> | null> {
    const raw = await page.evaluate(
        () => (window as unknown as { playablesSaves: string[] }).playablesSaves.at(-1) ?? null
    );
    return raw === null ? null : (JSON.parse(raw) as Record<string, unknown>);
}

/** JS heap in MiB (Chromium only). Playables crash on iOS above 512 MB. */
export async function heapMiB(page: Page): Promise<number> {
    return page.evaluate(() => {
        const memory = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
        return (memory?.usedJSHeapSize ?? 0) / (1024 * 1024);
    });
}
