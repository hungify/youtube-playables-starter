import type { YTGameError, YTGameErrorType, YTGameSDK } from '../types/ytgame';

export const SDKErrorType = Object.freeze({
    UNKNOWN: 'UNKNOWN',
    API_UNAVAILABLE: 'API_UNAVAILABLE',
    INVALID_PARAMS: 'INVALID_PARAMS',
    SIZE_LIMIT_EXCEEDED: 'SIZE_LIMIT_EXCEEDED'
} as const);

export type SDKErrorTypeValue = (typeof SDKErrorType)[keyof typeof SDKErrorType];

/** Any JSON-serialisable cloud save. Each game narrows this with its own save interface. */
export interface PlayablesSaveData {
    [key: string]: unknown;
}

const LONE_SURROGATE_LITERAL_RE =
    /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;
const LONE_SURROGATE_ESCAPED_RE =
    /\\u[dD][89abAB][0-9a-fA-F]{2}(?!\\u[dD][c-fC-F][0-9a-fA-F]{2})|(?<!\\u[dD][89abAB][0-9a-fA-F]{2})\\u[dD][c-fC-F][0-9a-fA-F]{2}/g;

class YouTubePlayablesController {
    version = 'unloaded';
    inPlayablesEnv = false;

    private ytgameRef: YTGameSDK | null = null;
    private firstFrameReadySent = false;
    private gameReadySent = false;
    private unsetAudioCallback: (() => void) | undefined = undefined;
    private language = 'unavailable';
    private data: PlayablesSaveData | null = null;
    private dataLoaded = false;

    resetWithMock(sdk: YTGameSDK | null, inEnv = true): void {
        this.ytgameRef = sdk;
        this.version = sdk?.SDK_VERSION ?? 'unloaded';
        this.inPlayablesEnv = inEnv;
        this.firstFrameReadySent = false;
        this.gameReadySent = false;
        this.unsetAudioCallback = undefined;
        this.language = 'unavailable';
        this.data = null;
        this.dataLoaded = false;
    }

    boot(loadedCallback: () => void): void {
        const callback = (): void => {
            if (typeof window !== 'undefined' && window.ytgame) {
                this.ytgameRef = window.ytgame;
                this.version = this.ytgameRef.SDK_VERSION;
                this.inPlayablesEnv = this.ytgameRef.IN_PLAYABLES_ENV;
            } else {
                console.error('YouTube Playables SDK is not available.');
            }

            loadedCallback();
        };

        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            callback();
            return;
        }

        const check = (): void => {
            document.removeEventListener('DOMContentLoaded', check, true);
            window.removeEventListener('load', check, true);
            callback();
        };

        if (!document.body) {
            window.setTimeout(check, 20);
        } else {
            document.addEventListener('DOMContentLoaded', check, true);
            window.addEventListener('load', check, true);
        }
    }

    firstFrameReady(): void {
        if (!this.isLoaded() || this.firstFrameReadySent || !this.ytgameRef) {
            return;
        }

        this.ytgameRef.game.firstFrameReady();
        this.firstFrameReadySent = true;
    }

    gameReady(): void {
        if (!this.isLoaded() || this.gameReadySent || !this.ytgameRef) {
            return;
        }

        if (!this.firstFrameReadySent) {
            console.error('gameReady called before firstFrameReady');
            return;
        }

        this.ytgameRef.game.gameReady();
        this.gameReadySent = true;
    }

    isFirstFrameReady(): boolean {
        return this.firstFrameReadySent;
    }

    isGameReady(): boolean {
        return this.gameReadySent;
    }

    isLoaded(): boolean {
        return Boolean(this.ytgameRef && this.inPlayablesEnv);
    }

    isReady(): boolean {
        return this.isLoaded() && this.firstFrameReadySent && this.gameReadySent;
    }

    sendScore(score: number): void {
        if (this.isReady() && this.ytgameRef) {
            try {
                void this.ytgameRef.engagement.sendScore({ value: score });
            } catch (error) {
                const sdkErr = error as YTGameError | undefined;
                if (sdkErr?.errorType !== undefined) {
                    this.handleError(sdkErr.errorType);
                }
            }
        }
    }

    setOnPause(callback: () => void): void {
        if (this.isLoaded() && this.ytgameRef) {
            this.ytgameRef.system.onPause(callback);
        }
    }

    setOnResume(callback: () => void): void {
        if (this.isLoaded() && this.ytgameRef) {
            this.ytgameRef.system.onResume(callback);
        }
    }

    loadData<T extends PlayablesSaveData = PlayablesSaveData>(): Promise<T | undefined> {
        return new Promise<T | undefined>((resolve, reject) => {
            if (this.isLoaded() && this.ytgameRef) {
                this.ytgameRef.game
                    .loadData()
                    .then((rawdata: string) => {
                        this.dataLoaded = true;

                        if (rawdata) {
                            try {
                                const parsed = JSON.parse(rawdata) as T;
                                this.data = parsed;
                                resolve(parsed);
                            } catch (error) {
                                console.error('Failed to parse loadData');
                                this.logError();
                                reject(error);
                            }
                        } else {
                            resolve(undefined);
                        }
                    })
                    .catch((error: unknown) => {
                        console.error('Failed to loadData');
                        const sdkErr = error as YTGameError | undefined;
                        if (sdkErr?.errorType !== undefined) {
                            this.handleError(sdkErr.errorType);
                        }
                        this.logError();
                        reject(error);
                    });
            } else {
                this.dataLoaded = true;
                resolve(undefined);
            }
        });
    }

    logError(): void {
        if (this.isLoaded() && this.ytgameRef) {
            this.ytgameRef.health.logError();
        }
    }

    logWarning(): void {
        if (this.isLoaded() && this.ytgameRef) {
            this.ytgameRef.health.logWarning();
        }
    }

    hasLoneSurrogates(str: string): boolean {
        LONE_SURROGATE_LITERAL_RE.lastIndex = 0;
        LONE_SURROGATE_ESCAPED_RE.lastIndex = 0;
        return LONE_SURROGATE_LITERAL_RE.test(str) || LONE_SURROGATE_ESCAPED_RE.test(str);
    }

    sanitizeUtf16Json(jsonString: string): string {
        return jsonString
            .replace(LONE_SURROGATE_LITERAL_RE, '')
            .replace(LONE_SURROGATE_ESCAPED_RE, '');
    }

    saveData<T extends Record<string, unknown>>(payload: T): Promise<T | undefined> {
        return new Promise<T | undefined>((resolve, reject) => {
            if (this.isLoaded() && this.ytgameRef) {
                if (!this.dataLoaded) {
                    console.error('saveData called before loadData completed');
                    reject(new Error('MUST await loadData before calling saveData'));
                    return;
                }

                const jsonString = JSON.stringify(payload);

                if (this.hasLoneSurrogates(jsonString)) {
                    console.warn('Lone surrogates found in the JSON string');
                }

                const validUtf16String = this.sanitizeUtf16Json(jsonString);

                this.ytgameRef.game
                    .saveData(validUtf16String)
                    .then(() => {
                        resolve(payload);
                    })
                    .catch((error: unknown) => {
                        console.error('Failed to saveData');
                        const sdkErr = error as YTGameError | undefined;
                        if (sdkErr?.errorType !== undefined) {
                            this.handleError(sdkErr.errorType);
                        }
                        this.logError();
                        reject(error);
                    });
            } else {
                resolve(undefined);
            }
        });
    }

    getData(): PlayablesSaveData | null {
        return this.data;
    }

    loadLanguage(): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            if (this.isLoaded() && this.ytgameRef) {
                this.ytgameRef.system
                    .getLanguage()
                    .then((lang: string) => {
                        this.language = lang;
                        resolve(lang);
                    })
                    .catch((error: unknown) => {
                        console.error('Failed to getLanguage');
                        this.logError();
                        reject(error);
                    });
            } else {
                resolve(this.language);
            }
        });
    }

    getLanguage(): string {
        return this.language;
    }

    isAudioEnabled(): boolean {
        if (this.isLoaded() && this.ytgameRef) {
            return this.ytgameRef.system.isAudioEnabled();
        }
        return true;
    }

    setAudioChangeCallback(callback: (isAudioEnabled: boolean) => void): void {
        if (this.isLoaded() && this.ytgameRef) {
            if (this.unsetAudioCallback) {
                this.unsetAudioCallback();
            }
            this.unsetAudioCallback = this.ytgameRef.system.onAudioEnabledChange(callback);
        }
    }

    unsetAudioChangeCallback(): void {
        if (this.unsetAudioCallback) {
            this.unsetAudioCallback();
            this.unsetAudioCallback = undefined;
        }
    }

    async requestInterstitialAd(): Promise<boolean> {
        if (!this.isLoaded() || !this.ytgameRef?.ads?.requestInterstitialAd) {
            return false;
        }
        try {
            await this.ytgameRef.ads.requestInterstitialAd();
            return true;
        } catch (error) {
            const sdkErr = error as YTGameError | undefined;
            if (sdkErr?.errorType !== undefined) {
                this.handleError(sdkErr.errorType);
            }
            return false;
        }
    }

    async requestRewardedAd(rewardId: string): Promise<boolean> {
        if (!this.isLoaded() || !this.ytgameRef?.ads?.requestRewardedAd) {
            return false;
        }
        try {
            return Boolean(await this.ytgameRef.ads.requestRewardedAd(rewardId));
        } catch (error) {
            const sdkErr = error as YTGameError | undefined;
            if (sdkErr?.errorType !== undefined) {
                this.handleError(sdkErr.errorType);
            }
            return false;
        }
    }

    handleError(errorType: YTGameErrorType): SDKErrorTypeValue | null {
        switch (errorType) {
            case SDKErrorType.UNKNOWN:
            case 0:
                console.error('The error is unknown.');
                return SDKErrorType.UNKNOWN;
            case SDKErrorType.API_UNAVAILABLE:
            case 1:
                console.error('The API is temporarily unavailable. Please try again later.');
                return SDKErrorType.API_UNAVAILABLE;
            case SDKErrorType.INVALID_PARAMS:
            case 2:
                console.error('The API was called with invalid parameters.');
                return SDKErrorType.INVALID_PARAMS;
            case SDKErrorType.SIZE_LIMIT_EXCEEDED:
            case 3:
                console.error('The API was called with parameters exceeding the size limit.');
                return SDKErrorType.SIZE_LIMIT_EXCEEDED;
            default:
                console.error('Unhandled error type.');
                return null;
        }
    }

    withTimeout<T>(promise: Promise<T>, timeout = 2000): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error('Operation timed out'));
            }, timeout);

            promise
                .then((value) => {
                    clearTimeout(timer);
                    resolve(value);
                })
                .catch((err: unknown) => {
                    clearTimeout(timer);
                    reject(err);
                });
        });
    }
}

export const YouTubePlayables = new YouTubePlayablesController();
