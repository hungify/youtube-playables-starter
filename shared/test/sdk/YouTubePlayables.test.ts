import { describe, test, expect, beforeEach } from 'bun:test';
import { YouTubePlayables } from '@sdk/YouTubePlayables';

describe('YouTubePlayables SDK certification invariants', () => {
    let calls: Array<string | readonly [string, unknown]>;

    beforeEach(() => {
        calls = [];
        YouTubePlayables.resetWithMock({
            SDK_VERSION: '1.0.0-test',
            IN_PLAYABLES_ENV: true,
            game: {
                firstFrameReady: () => {
                    calls.push('firstFrameReady');
                },
                gameReady: () => {
                    calls.push('gameReady');
                },
                loadData: async () => JSON.stringify({ activeCar: 'car2', bestScore: 1500 }),
                saveData: async (payload: string) => {
                    calls.push(['saveData', payload]);
                }
            },
            engagement: {
                sendScore: async ({ value }) => {
                    calls.push(['sendScore', value]);
                }
            },
            system: {
                isAudioEnabled: () => false,
                onAudioEnabledChange: () => {
                    calls.push('onAudioEnabledChange');
                    return () => {
                        calls.push('unsetAudio');
                    };
                },
                onPause: (cb) => {
                    calls.push(['onPause', typeof cb]);
                    return () => {};
                },
                onResume: (cb) => {
                    calls.push(['onResume', typeof cb]);
                    return () => {};
                },
                getLanguage: async () => 'en-US'
            },
            ads: {
                requestInterstitialAd: async () => {
                    calls.push('interstitialAd');
                },
                requestRewardedAd: async (id: string) => {
                    calls.push(['rewardedAd', id]);
                    return true;
                }
            },
            health: {
                logError: () => {
                    calls.push('logError');
                },
                logWarning: () => {
                    calls.push('logWarning');
                }
            }
        });
    });

    test('blocks gameReady() if firstFrameReady() was not called first (Rule #2)', () => {
        YouTubePlayables.gameReady();
        expect(YouTubePlayables.isGameReady()).toBe(false);
        expect(calls).toEqual([]);

        YouTubePlayables.firstFrameReady();
        YouTubePlayables.gameReady();
        expect(YouTubePlayables.isFirstFrameReady()).toBe(true);
        expect(YouTubePlayables.isGameReady()).toBe(true);
        expect(calls).toEqual(['firstFrameReady', 'gameReady']);
    });

    test('blocks saveData() before loadData() and strips UTF-16 lone surrogates (Rule #4)', async () => {
        await expect(YouTubePlayables.saveData({ activeCar: 'car1' })).rejects.toThrow(
            'MUST await loadData before calling saveData'
        );

        const loaded = await YouTubePlayables.loadData();
        expect(loaded).toEqual({ activeCar: 'car2', bestScore: 1500 });

        await YouTubePlayables.saveData({ activeCar: 'car3', bad: 'ok\uD800' });
        expect(calls).toEqual([['saveData', '{"activeCar":"car3","bad":"ok"}']]);
    });

    test('unregisters previous audio listener on set/unset (Rule #5)', () => {
        YouTubePlayables.setAudioChangeCallback(() => {});
        YouTubePlayables.unsetAudioChangeCallback();
        expect(calls).toEqual(['onAudioEnabledChange', 'unsetAudio']);
    });

    test('handles interstitial and rewarded ads', async () => {
        expect(await YouTubePlayables.requestInterstitialAd()).toBe(true);
        expect(await YouTubePlayables.requestRewardedAd('revive-1')).toBe(true);
        expect(calls).toEqual(['interstitialAd', ['rewardedAd', 'revive-1']]);
    });
});
